var sample_softmax_temperature = data.generate.temperature; // how peaky model predictions should be
var max_chars_gen = data.generate.max_tokens; // max length of generated sentences



// various global var inits
var epoch_size = -1;
var input_size = -1;
var output_size = -1;
var letterToIndex = {};
var indexToLetter = {};

var vocab = [];
var data_sents = [];

var solver = new R.Solver(); // should be class because it needs memory for step caches


  let  hidden_sizes = data.params.hidden_sizes; // list of sizes of hidden layers
  let  letter_size = data.params.letter_size; // size of letter embeddings
    
    // optimization
  let  regc = 0.000001; // L2 regularization strength
  let  learning_rate = data.params.learning_rate; // learning rate
  let  clipval = 5.0; // clip gradients at this value

var model = {};

var initVocab = function(sents, count_threshold) {
  // go over all characters and keep track of all unique ones seen
  var txt = sents.join(''); // concat all

  // count up all characters
  var d = {};
  for(var i=0,n=txt.length;i<n;i++) {
    var txti = txt[i];
    if(txti in d) { d[txti] += 1; } 
    else { d[txti] = 1; }
  }

  // filter by count threshold and create pointers
  letterToIndex = {};
  indexToLetter = {};
  vocab = [];
  // NOTE: start at one because we will have START and END tokens!
  // that is, START token will be index 0 in model letter vectors
  // and END token will be index 0 in the next character softmax
  var q = 1; 
  for(ch in d) {
    if(d.hasOwnProperty(ch)) {
      if(d[ch] >= count_threshold) {
        // add character to vocab
        letterToIndex[ch] = q;
        indexToLetter[q] = ch;
        vocab.push(ch);
        q++;
      }
    }
  }

  // globals written: indexToLetter, letterToIndex, vocab (list), and:
  input_size = vocab.length + 1;
  output_size = vocab.length + 1;
  epoch_size = sents.length;
  data.tokens = vocab

}

var utilAddToModel = function(modelto, modelfrom) {
  for(var k in modelfrom) {
    if(modelfrom.hasOwnProperty(k)) {
      // copy over the pointer but change the key to use the append
      modelto[k] = modelfrom[k];
    }
  }
}

var initModel = function() {
  // letter embedding vectors
  var model = {};
  model['Wil'] = new R.RandMat(input_size, letter_size , 0, 0.08);
  

    var lstm = R.initLSTM(letter_size, hidden_sizes, output_size);
    utilAddToModel(model, lstm);
  

  return model;
}



var reinit = function() {

  solver = new R.Solver(); // reinit solver


  ppl_list = [];
  tick_iter = 0;

  // process the input, filter out blanks
  var data_sents_raw = data.inputText.split('\n');
  data_sents = [];
  for(var i=0;i<data_sents_raw.length;i++) {
    var sent = data_sents_raw[i].trim();
    if(sent.length > 0) {
      data_sents.push(sent);
    }
  }

  initVocab(data_sents, 1); // takes count threshold for characters
  highlightTokens()
  model = initModel();
}

var saveModel = function() {
  var out = {};
  out['hidden_sizes'] = hidden_sizes;
  out['generator'] = generator;
  out['letter_size'] = letter_size;
  var model_out = {};
  for(var k in model) {
    if(model.hasOwnProperty(k)) {
      model_out[k] = model[k].toJSON();
    }
  }
  out['model'] = model_out;
  var solver_out = {};
  solver_out['decay_rate'] = solver.decay_rate;
  solver_out['smooth_eps'] = solver.smooth_eps;
  step_cache_out = {};
  for(var k in solver.step_cache) {
    if(solver.step_cache.hasOwnProperty(k)) {
      step_cache_out[k] = solver.step_cache[k].toJSON();
    }
  }
  solver_out['step_cache'] = step_cache_out;
  out['solver'] = solver_out;
  out['letterToIndex'] = letterToIndex;
  out['indexToLetter'] = indexToLetter;
  out['vocab'] = vocab;
  $("#tio").val(JSON.stringify(out));
}

var loadModel = function(j) {
  hidden_sizes = j.hidden_sizes;
  generator = j.generator;
  letter_size = j.letter_size;
  model = {};
  for(var k in j.model) {
    if(j.model.hasOwnProperty(k)) {
      var matjson = j.model[k];
      model[k] = new R.Mat(1,1);
      model[k].fromJSON(matjson);
    }
  }
  solver = new R.Solver(); // have to reinit the solver since model changed
  solver.decay_rate = j.solver.decay_rate;
  solver.smooth_eps = j.solver.smooth_eps;
  solver.step_cache = {};
  for(var k in j.solver.step_cache){
      if(j.solver.step_cache.hasOwnProperty(k)){
          var matjson = j.solver.step_cache[k];
          solver.step_cache[k] = new R.Mat(1,1);
          solver.step_cache[k].fromJSON(matjson);
      }
  }
  letterToIndex = j['letterToIndex'];
  indexToLetter = j['indexToLetter'];
  vocab = j['vocab'];

  // reinit these
  ppl_list = [];
  tick_iter = 0;
}

var forwardIndex = function(G, model, ix, prev) {
  var x = G.rowPluck(model['Wil'], ix);
  // forward prop the sequence learner
 
    var out_struct = R.forwardLSTM(G, model, hidden_sizes, x, prev);
  
  return out_struct;
}

var predictSentence = function(model, samplei, temperature) {
  if(typeof samplei === 'undefined') { samplei = false; }
  if(typeof temperature === 'undefined') { temperature = 1.0; }

  var G = new R.Graph(false);
  var s = '';
  var prev = {};
  while(true) {

    // RNN tick
    var ix = s.length === 0 ? 0 : letterToIndex[s[s.length-1]];
    var lh = forwardIndex(G, model, ix, prev);
    prev = lh;

    // sample predicted letter
    logprobs = lh.o;
    if(temperature !== 1.0 && samplei) {
      // scale log probabilities by temperature and renormalize
      // if temperature is high, logprobs will go towards zero
      // and the softmax outputs will be more diffuse. if temperature is
      // very low, the softmax outputs will be more peaky
      for(var q=0,nq=logprobs.w.length;q<nq;q++) {
        logprobs.w[q] /= temperature;
      }
    }

    probs = R.softmax(logprobs);
    if(samplei) {
      var ix = R.samplei(probs.w);
    } else {
      var ix = R.maxi(probs.w);  
    }
    
    if(ix === 0) break; // END token predicted, break out
    if(s.length > max_chars_gen) { break; } // something is wrong

    var letter = indexToLetter[ix];
    s += letter;
  }
  return s;
}

var costfun = function(model, sent) {
  // takes a model and a sentence and
  // calculates the loss. Also returns the Graph
  // object which can be used to do backprop
  var n = sent.length;
  var G = new R.Graph();
  var log2ppl = 0.0;
  var cost = 0.0;
  var prev = {};
  for(var i=-1;i<n;i++) {
    // start and end tokens are zeros
    var ix_source = i === -1 ? 0 : letterToIndex[sent[i]]; // first step: start with START token
    var ix_target = i === n-1 ? 0 : letterToIndex[sent[i+1]]; // last step: end with END token

    lh = forwardIndex(G, model, ix_source, prev);
    prev = lh;

    // set gradients into logprobabilities
    logprobs = lh.o; // interpret output as logprobs
    probs = R.softmax(logprobs); // compute the softmax probabilities

    log2ppl += -Math.log2(probs.w[ix_target]); // accumulate base 2 log prob and do smoothing
    cost += -Math.log(probs.w[ix_target]);

    // write gradients into log probabilities
    logprobs.dw = probs.w;
    logprobs.dw[ix_target] -= 1
  }
  var ppl = Math.pow(2, log2ppl / (n - 1));
  return {'G':G, 'ppl':ppl, 'cost':cost};
}

function median(values) {
  values.sort( function(a,b) {return a - b;} );
  var half = Math.floor(values.length/2);
  if(values.length % 2) return values[half];
  else return (values[half-1] + values[half]) / 2.0;
}

var ppl_list = [];
var tick_iter = 0;
var tick = function() {

  // sample sentence fromd data
  var sentix = R.randi(0,data_sents.length);
  var sent = data_sents[sentix];

  var t0 = +new Date();  // log start timestamp

  // evaluate cost function on a sentence
  var cost_struct = costfun(model, sent);
  
  // use built up graph to compute backprop (set .dw fields in mats)
  cost_struct.G.backward();
  // perform param update
solver.step(model, learning_rate, regc, clipval);
 




  ppl_list.push(cost_struct.ppl); // keep track of perplexity

  // evaluate now and then
  tick_iter += 1;
 
    // draw argmax prediction
    var pred = predictSentence(model, false);
    data.prediction = pred;

    // keep track of perplexity
    data.stats.epoch = (tick_iter/epoch_size).toFixed(2)
    data.stats.preplexity = cost_struct.ppl.toFixed(2)
}

var gradCheck = function() {
  var model = initModel();
  var sent = '^test sentence$';
  var cost_struct = costfun(model, sent);
  cost_struct.G.backward();
  var eps = 0.000001;

  for(var k in model) {
    if(model.hasOwnProperty(k)) {
      var m = model[k]; // mat ref
      for(var i=0,n=m.w.length;i<n;i++) {
        
        oldval = m.w[i];
        m.w[i] = oldval + eps;
        var c0 = costfun(model, sent);
        m.w[i] = oldval - eps;
        var c1 = costfun(model, sent);
        m.w[i] = oldval;

        var gnum = (c0.cost - c1.cost)/(2 * eps);
        var ganal = m.dw[i];
        var relerr = (gnum - ganal)/(Math.abs(gnum) + Math.abs(ganal));
        if(relerr > 1e-1) {
          console.log(k + ': numeric: ' + gnum + ', analytic: ' + ganal + ', err: ' + relerr);
        }
      }
    }
  }
}

var iid = null;



  // attach button handlers
  function learn(){ 
    reinit();
    if(iid !== null) { clearInterval(iid); }
    iid = setInterval(tick, 0); 
  };
function stop(){ 
    if(iid !== null) { clearInterval(iid); }
    iid = null;
  }


  

  learn(); // simulate click on startup

  //$('#gradcheck').click(gradCheck);
  function generateColor(token) {
    const hash = token.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + acc;
    }, 0);
    return `hsl(${hash % 40}, 100%, 50%)`;
}

function highlightTokens() {
    const text = data.inputText;
    const tokens = data.tokens;

    const tokenColors = {};
    tokens.forEach(token => {
        tokenColors[token] = generateColor(token);
    });

    return {
        text,
        tokens,
        tokenColors,

        getTokenColor(char) {
            return this.tokenColors[char] || 'black';
        },
    };
} 


  

function decrementHiddenSizes() {
  for (let i = 0; i < data.params.hidden_sizes.length; i++) {
      data.params.hidden_sizes[i]--;
  }
  drawNetwork();
}

function addHiddenSize() {
  for (let i = 0; i < data.params.hidden_sizes.length; i++) {
    data.params.hidden_sizes[i]++;
}
  drawNetwork();
}

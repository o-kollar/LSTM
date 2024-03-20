
    // Define the canvas and its context
    const canvas = document.getElementById('networkCanvas');
    const ctx = canvas.getContext('2d');

    let layerSizes = data.params.hidden_sizes;

    // Function to update network size based on user input

        drawNetwork();
 

    // Function to draw a circle representing a neuron
    function drawNeuron(x, y) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#eb5f5b';
        ctx.fill();
        ctx.strokeStyle = '#eb5f5b';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
    }

    // Function to draw a line representing a connection between neurons
    function drawConnection(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.closePath();
    }

    // Function to draw the entire neural network
    function drawNetwork() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const layerWidth = canvas.width / (layerSizes.length + 1);
        for (let i = 0; i < layerSizes.length; i++) {
            const neuronsInLayer = layerSizes[i];
            const layerX = layerWidth * (i + 1);
            const verticalGap = canvas.height / (neuronsInLayer + 1);
            for (let j = 0; j < neuronsInLayer; j++) {
                const neuronY = verticalGap * (j + 1);
                drawNeuron(layerX, neuronY);
                if (i < layerSizes.length - 1) {
                    // Draw connections to next layer
                    const nextLayerNeurons = layerSizes[i + 1];
                    const nextLayerX = layerWidth * (i + 2);
                    const nextVerticalGap = canvas.height / (nextLayerNeurons + 1);
                    for (let k = 0; k < nextLayerNeurons; k++) {
                        const nextNeuronY = nextVerticalGap * (k + 1);
                        drawConnection(layerX, neuronY, nextLayerX, nextNeuronY);
                    }
                }
            }
        }
    }

    // Draw initial network
    drawNetwork();

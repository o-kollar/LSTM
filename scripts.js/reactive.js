let data = Alpine.reactive({
    inputText:"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    prediction:"",
    tokens:"",
    stats:{
        epoch:0,
        preplexity:0,
    },
    params:{
        neurons:10,
        hidden_sizes:[10,10], 
        letter_size:5,
        learning_rate:0.01,
    },
    generate:{
        temperature:0.7,
        max_tokens:500, 
    }
})


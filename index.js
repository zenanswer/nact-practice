//const { start, dispatch, stop, spawnStateless } = require('nact');
const nact = require('nact')
var StateMachine = require('javascript-state-machine');
var StateMachineHistory = require('javascript-state-machine/lib/history')
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

var runStatelessSample = function(system) {

    const greeter = nact.spawnStateless(
        system, // parent
        (msg, ctx) => console.log(`Hello ${msg.name}`), // function
        'greeter' // name
    )

    nact.dispatch(greeter, { name: 'Erlich Bachman' })
}

var runSample = function(system) {
    const spawnMy = (parent, f, name, properties) =>
        nact.spawn(parent, 
            (state, msg, ctx) => f.call(ctx, msg, ctx), 
            name, 
            { ...properties, onCrash: (msg, error, ctx) => {
                console.log(msg, error, ctx)
                ctx.resume} });


    var fsm = null
    const ACTION = {
        PROCESS_INPUT: 'process the input',
        ASK_INPUT: 'ask a input'
    }
    const fsmMate = spawnMy(
        system,
        (message, ctx) => {
            switch (message.action) {
                case ACTION.PROCESS_INPUT: {
                    console.log('inputProcess %s', message.input)
                    if (message.input != undefined && message.input == 'stop') {
                        console.log('push exit')
                        fsm.exit()
                        return
                    }
                    if(isNaN(message.input)) {
                        console.log('push inputResult(false)')
                        fsm.result(false)
                        return
                    } else {
                        console.log('push inputResult(true)')
                        fsm.result(true)
                        return
                    }
                }
                case ACTION.ASK_INPUT: {
                    readline.question(`Please input a number:`, (number) => {
                        console.log(`You input a [${number}].`)
                        //readline.close()
                        fsm.input(number)
                    })
                    //fsm.input('123')    
                }
            }
        },
        'fsmMate'
    )
    fsm = new StateMachine({
        init: 'init',
        transitions: [
            { name: 'start',         from: 'init',          to: 'wait4input'   },
            { name: 'input',         from: 'wait4input',    to: 'processinput' },
            { name: 'exit',          from: 'processinput',  to: 'stop'         },
            { name: 'result',        from: 'processinput',  to: 'wait4input'   }
        ],
        methods: {
            //on*Event*
            onStart: function() {
                console.log('start')
            },
            onInput: function(_, inputStr) {
                console.log('input dispatch')
                nact.dispatch(fsmMate, {action:ACTION.PROCESS_INPUT, input:inputStr})
            },
            onExit: function() {
                console.log('It\'s stopped.')
            },
            onResult: function(lifecycle, result) {
                console.log('It\'s %sa Number.', result?'':'NOT ')
            },
            //onEnter*State*
            onEnterInit : function() {
                console.log('onEnterInit')
            },
            onEnterWait4input : function() {
                console.log('onEnterWait4input')
                nact.dispatch(fsmMate, {action:ACTION.ASK_INPUT})
            },
            onEnterProcessinput : function() {
                console.log('onEnterProcessinput')
            },
            onEnterStop : function() {
                console.log('onEnterStop')
            }
        },
    plugins: [
      new StateMachineHistory()     //  <-- plugin enabled here
    ]
    })

    fsm.start()
    //fsm.input('123')
    setInterval(function () {  
        console.log(fsm.is('stop'), fsm.history )
    }, 1000)
}

var main = function() {

    const system = nact.start()

    runStatelessSample(system)
    runSample(system)
}

if (require.main === module) { 
    main(); 
}
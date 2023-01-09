pragma circom 2.0.1;

include "circomlib/mimc.circom";

template Example(foo, bar) {
    signal input a;
    signal input b;
    signal output c;
    
    for (var i = 0; i < foo; i++) {
        log(i);
    }
    
    component mimc = MiMC7(91);
    mimc.x_in <== a;
    mimc.k <== 22;
    log(mimc.out);

    c <== mimc.out;
}

component main { public [ a ] } = Example(4, 5 - 1);

/* INPUT = {
    "a": "5",
    "b": "77"
} */
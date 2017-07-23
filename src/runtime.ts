// Copyright 2015 Bobby Powers. All rights reserved.
// Use of this source code is governed by the MIT
// license that can be found in the LICENSE file.

'use strict';

/* tslint:disable: max-line-length */

export const preamble = "'use strict';\nfunction i32(n) {\n    'use strict';\n    return n | 0;\n}\nvar Simulation = (function () {\n    function Simulation() {\n    }\n    Simulation.prototype.lookupOffset = function (id) {\n        if (id === 'time')\n            return 0;\n        if (id[0] === '.')\n            id = id.substr(1);\n        if (id in this.offsets)\n            return this._shift + this.offsets[id];\n        var parts = id.split('.');\n        if (parts.length === 1 && id === \"\" && this.name in this.offsets)\n            return this._shift + this.offsets[this.name];\n        var nextSim = this.modules[parts[0]];\n        if (!nextSim)\n            return -1;\n        return nextSim.lookupOffset(parts.slice(1).join('.'));\n    };\n    Simulation.prototype.root = function () {\n        if (!this.parent)\n            return this;\n        return this.parent.root();\n    };\n    Simulation.prototype.resolveAllSymbolicRefs = function () {\n        for (var n in this.symRefs) {\n            if (!this.symRefs.hasOwnProperty(n))\n                continue;\n            var ctx = void 0;\n            if (this.symRefs[n][0] === '.') {\n                ctx = this.root();\n            }\n            else {\n                ctx = this.parent;\n            }\n            this.ref[n] = ctx.lookupOffset(this.symRefs[n]);\n        }\n        for (var n in this.modules) {\n            if (!this.modules.hasOwnProperty(n))\n                continue;\n            this.modules[n].resolveAllSymbolicRefs();\n        }\n    };\n    Simulation.prototype.varNames = function () {\n        var result = Object.keys(this.offsets).slice();\n        for (var v in this.modules) {\n            if (!this.modules.hasOwnProperty(v))\n                continue;\n            var ids = [];\n            var modVarNames = this.modules[v].varNames();\n            for (var n in modVarNames) {\n                if (modVarNames.hasOwnProperty(n))\n                    ids.push(v + '.' + modVarNames[n]);\n            }\n            result = result.concat(ids);\n        }\n        if (this.name === 'main')\n            result.push('time');\n        return result;\n    };\n    Simulation.prototype.getNVars = function () {\n        var nVars = Object.keys(this.offsets).length;\n        for (var n in this.modules) {\n            if (this.modules.hasOwnProperty(n))\n                nVars += this.modules[n].getNVars();\n        }\n        if (this.name === 'main')\n            nVars++;\n        return nVars;\n    };\n    Simulation.prototype.reset = function () {\n        var spec = this.simSpec;\n        var nSaveSteps = i32((spec.stop - spec.start) / spec.saveStep + 1);\n        this.stepNum = 0;\n        this.slab = new Float64Array(this.nVars * (nSaveSteps + 1));\n        var curr = this.curr();\n        curr[0] = spec.start;\n        this.saveEvery = Math.max(1, i32(spec.saveStep / spec.dt + 0.5));\n        this.calcInitial(this.simSpec.dt, curr);\n    };\n    Simulation.prototype.dominance = function (forced, indicators) {\n        var dt = this.simSpec.dt;\n        var curr = this.curr().slice();\n        var next = new Float64Array(curr.length);\n        for (var name_1 in forced) {\n            if (!forced.hasOwnProperty(name_1))\n                continue;\n            var off = this.lookupOffset(name_1);\n            if (off === -1) {\n                console.log(\"WARNING: variable '\" + name_1 + \"' not found.\");\n                return {};\n            }\n            curr[off] = forced[name_1];\n        }\n        this.calcFlows(dt, curr);\n        this.calcStocks(dt, curr, next);\n        next[0] = curr[0] + dt;\n        var result = {};\n        for (var i = 0; i < indicators.length; i++) {\n            var name_2 = indicators[i];\n            var off = this.lookupOffset(name_2);\n            if (off === -1) {\n                console.log(\"WARNING: variable '\" + name_2 + \"' not found.\");\n                continue;\n            }\n            result[name_2] = next[off];\n        }\n        return result;\n    };\n    Simulation.prototype.runTo = function (endTime) {\n        var dt = this.simSpec.dt;\n        var curr = this.curr();\n        var next = this.slab.subarray((this.stepNum + 1) * this.nVars, (this.stepNum + 2) * this.nVars);\n        while (curr[0] <= endTime) {\n            this.calcFlows(dt, curr);\n            this.calcStocks(dt, curr, next);\n            next[0] = curr[0] + dt;\n            if (this.stepNum++ % this.saveEvery !== 0) {\n                curr.set(next);\n            }\n            else {\n                curr = next;\n                next = this.slab.subarray((i32(this.stepNum / this.saveEvery) + 1) * this.nVars, (i32(this.stepNum / this.saveEvery) + 2) * this.nVars);\n            }\n        }\n    };\n    Simulation.prototype.runToEnd = function () {\n        return this.runTo(this.simSpec.stop + 0.5 * this.simSpec.dt);\n    };\n    Simulation.prototype.curr = function () {\n        return this.slab.subarray((this.stepNum) * this.nVars, (this.stepNum + 1) * this.nVars);\n    };\n    Simulation.prototype.setValue = function (name, value) {\n        var off = this.lookupOffset(name);\n        if (off === -1)\n            return;\n        this.curr()[off] = value;\n    };\n    Simulation.prototype.value = function (name) {\n        var off = this.lookupOffset(name);\n        if (off === -1)\n            return;\n        var saveNum = i32(this.stepNum / this.saveEvery);\n        var slabOff = this.nVars * saveNum;\n        return this.slab.subarray(slabOff, slabOff + this.nVars)[off];\n    };\n    Simulation.prototype.series = function (name) {\n        var saveNum = i32(this.stepNum / this.saveEvery);\n        var time = new Float64Array(saveNum);\n        var values = new Float64Array(saveNum);\n        var off = this.lookupOffset(name);\n        if (off === -1)\n            return;\n        for (var i = 0; i < time.length; i++) {\n            var curr = this.slab.subarray(i * this.nVars, (i + 1) * this.nVars);\n            time[i] = curr[0];\n            values[i] = curr[off];\n        }\n        return {\n            'name': name,\n            'time': time,\n            'values': values,\n        };\n    };\n    return Simulation;\n}());\nvar cmds;\nfunction handleMessage(e) {\n    'use strict';\n    var id = e.data[0];\n    var cmd = e.data[1];\n    var args = e.data.slice(2);\n    var result;\n    if (cmds.hasOwnProperty(cmd)) {\n        result = cmds[cmd].apply(null, args);\n    }\n    else {\n        result = [null, 'unknown command \"' + cmd + '\"'];\n    }\n    if (!Array.isArray(result))\n        result = [null, 'no result for [' + e.data.join(', ') + ']'];\n    var msg = [id, result];\n    this.postMessage(msg);\n}\nvar desiredSeries = null;\nfunction initCmds(main) {\n    'use strict';\n    return {\n        'reset': function () {\n            main.reset();\n            return ['ok', null];\n        },\n        'set_val': function (name, val) {\n            main.setValue(name, val);\n            return ['ok', null];\n        },\n        'get_val': function () {\n            var args = [];\n            for (var _i = 0; _i < arguments.length; _i++) {\n                args[_i - 0] = arguments[_i];\n            }\n            var result = {};\n            for (var i = 0; i < args.length; i++)\n                result[args[i]] = main.value(args[i]);\n            return [result, null];\n        },\n        'get_series': function () {\n            var args = [];\n            for (var _i = 0; _i < arguments.length; _i++) {\n                args[_i - 0] = arguments[_i];\n            }\n            var result = {};\n            for (var i = 0; i < args.length; i++)\n                result[args[i]] = main.series(args[i]);\n            return [result, null];\n        },\n        'dominance': function (overrides, indicators) {\n            return [main.dominance(overrides, indicators), null];\n        },\n        'run_to': function (time) {\n            main.runTo(time);\n            return [main.value('time'), null];\n        },\n        'run_to_end': function () {\n            var result = {};\n            main.runToEnd();\n            if (desiredSeries) {\n                for (var i = 0; i < desiredSeries.length; i++)\n                    result[desiredSeries[i]] = main.series(desiredSeries[i]);\n                return [result, null];\n            }\n            else {\n                return [main.value('time'), null];\n            }\n        },\n        'var_names': function () {\n            return [main.varNames(), null];\n        },\n        'set_desired_series': function (names) {\n            desiredSeries = names;\n            return ['ok', null];\n        },\n    };\n}\nfunction lookup(table, index) {\n    'use strict';\n    var size = table.x.length;\n    if (size === 0)\n        return NaN;\n    var x = table.x;\n    var y = table.y;\n    if (index <= x[0]) {\n        return y[0];\n    }\n    else if (index >= x[size - 1]) {\n        return y[size - 1];\n    }\n    var low = 0;\n    var high = size;\n    var mid;\n    while (low < high) {\n        mid = Math.floor(low + (high - low) / 2);\n        if (x[mid] < index) {\n            low = mid + 1;\n        }\n        else {\n            high = mid;\n        }\n    }\n    var i = low;\n    if (x[i] === index) {\n        return y[i];\n    }\n    else {\n        var slope = (y[i] - y[i - 1]) / (x[i] - x[i - 1]);\n        return (index - x[i - 1]) * slope + y[i - 1];\n    }\n}\nfunction max(a, b) {\n    'use strict';\n    a = +a;\n    b = +b;\n    return a > b ? a : b;\n}\nfunction min(a, b) {\n    'use strict';\n    a = +a;\n    b = +b;\n    return a < b ? a : b;\n}\nfunction pulse(dt, time, volume, firstPulse, interval) {\n    'use strict';\n    if (time < firstPulse)\n        return 0;\n    var nextPulse = firstPulse;\n    while (time >= nextPulse) {\n        if (time < nextPulse + dt) {\n            return volume / dt;\n        }\n        else if (interval <= 0.0) {\n            break;\n        }\n        else {\n            nextPulse += interval;\n        }\n    }\n    return 0;\n}";

export const epilogue = "var pr;\nif (typeof console === 'undefined') {\n    pr = print;\n}\nelse {\n    pr = console.log;\n}\nmain.runToEnd();\nvar series = {};\nvar header = 'time\\t';\nvar vars = main.varNames();\nfor (var i = 0; i < vars.length; i++) {\n    var v = vars[i];\n    if (v === 'time')\n        continue;\n    header += v + '\\t';\n    series[v] = main.series(v);\n}\npr(header.substr(0, header.length - 1));\nvar nSteps = main.series('time').time.length;\nfor (var i = 0; i < nSteps; i++) {\n    var msg = '';\n    for (var v in series) {\n        if (!series.hasOwnProperty(v))\n            continue;\n        if (msg === '')\n            msg += series[v].time[i] + '\\t';\n        msg += series[v].values[i] + '\\t';\n    }\n    pr(msg.substr(0, msg.length - 1));\n}";

export const drawCSS = "<defs><style>\n/* <![CDATA[ */\n.spark-axis {\n    stroke-width: 0.125;\n    stroke-linecap: round;\n    stroke: #999;\n    fill: none;\n}\n\n.spark-line {\n    stroke-width: 0.5;\n    stroke-linecap: round;\n    stroke: #2299dd;\n    fill: none;\n}\n\ntext {\n    font-size: 12px;\n    font-family: \"Roboto\", \"Open Sans\", Arial, sans-serif;\n    font-weight: 300;\n    text-anchor: middle;\n    white-space: nowrap;\n    vertical-align: middle;\n}\n\n.left-aligned {\n    text-anchor: start;\n}\n\n.right-aligned {\n    text-anchor: end;\n}\n/* ]]> */\n</style></defs>\n";

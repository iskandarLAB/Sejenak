import test from 'node:test';import assert from 'node:assert/strict';import {countdownParts} from '../worker/countdown.mjs';
test('Wedding countdown uses Malaysia midnight across visitor timezones',()=>{assert.deepEqual(countdownParts('2222-02-22',Date.parse('2222-02-21T15:59:59Z')),{days:0,hours:0,minutes:0,seconds:1,arrived:false})});
test('Countdown splits days, hours, minutes and seconds correctly',()=>{const target=Date.parse('2222-02-22T00:00:00+08:00');assert.deepEqual(countdownParts('2222-02-22',target-((2*86400+3*3600+4*60+5)*1000)),{days:2,hours:3,minutes:4,seconds:5,arrived:false})});
test('Countdown clamps at zero once wedding date arrives',()=>{assert.deepEqual(countdownParts('2020-01-01',Date.parse('2026-01-01T00:00:00Z')),{days:0,hours:0,minutes:0,seconds:0,arrived:true})});
test('Invalid countdown dates are ignored',()=>{assert.equal(countdownParts('invalid'),null)});

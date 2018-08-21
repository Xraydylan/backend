const prettyBytes = require('pretty-bytes');
const request = require('request');

//const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlJqQkJRVFV4UmpBM05qVkRORFEzT0RVMVFqUkdOVE0xTXpJNVJrWkdSa1V4UmpRMU0wSTRNdyJ9.eyJuaWNrbmFtZSI6InRlc3QiLCJuYW1lIjoidGVzdEBpbmcuY29tIiwicGljdHVyZSI6Imh0dHBzOi8vcy5ncmF2YXRhci5jb20vYXZhdGFyLzc4Y2IwODRmOGVhMDZlM2Y2OTFhZjA5YWU4NzAwY2FmP3M9NDgwJnI9cGcmZD1odHRwcyUzQSUyRiUyRmNkbi5hdXRoMC5jb20lMkZhdmF0YXJzJTJGdGUucG5nIiwidXBkYXRlZF9hdCI6IjIwMTgtMDgtMTlUMjI6MTc6MDEuODQ1WiIsImVtYWlsIjoidGVzdEBpbmcuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJpc3MiOiJodHRwczovL2F1cmEtc2xlZXAtYW5hbHlzaXMuZXUuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfDViNzcyMDFiNmZlOTY0NGFiMTQzNzdlZiIsImF1ZCI6IjR1RTFEd0s1QnRueUluTjE0TE8wTGI0Mk5YdHI1TUhDIiwiaWF0IjoxNTM0NzE3MDIxLCJleHAiOjE1MzQ3NTMwMjF9.K5GJceHwqbbNcylstqL4lDJYtVKtX5l7DCvYkLHiuu1wImmUY6A6D6jXtxd8cwIhqrrhIo9Wp-zTPsu0WWxj5Gl43cntEKT74Mj3EorfPFqwkN1FA2P70d8xJCER-bfG9YKTP1u4TZlkpdh5uF5WORsVXGsAt_acqfvabJkC4lx1HCPFlC9Xki-cZOOPdl3TvAiIxTsiRJrBT4JS1JMe1YjccOWtLZh6BeqgjpwxZUjT3ZxyaFyq76qsfv0t0mL9nTX7VnxWkP8sqjLI1TDngnKVdeqagPbPhbrcAlHMrf9JdsM5rblyN--ydUeBPm7wl3q2Q4n9mzl6TTN8am2Sjg';
const token = 
'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IlJqQkJRVFV4UmpBM05qVkRORFEzT0RVMVFqUkdOVE0xTXpJNVJrWkdSa1V4UmpRMU0wSTRNdyJ9.eyJuaWNrbmFtZSI6InRlc3QiLCJuYW1lIjoidGVzdEBpbmcuY29tIiwicGljdHVyZSI6Imh0dHBzOi8vcy5ncmF2YXRhci5jb20vYXZhdGFyLzc4Y2IwODRmOGVhMDZlM2Y2OTFhZjA5YWU4NzAwY2FmP3M9NDgwJnI9cGcmZD1odHRwcyUzQSUyRiUyRmNkbi5hdXRoMC5jb20lMkZhdmF0YXJzJTJGdGUucG5nIiwidXBkYXRlZF9hdCI6IjIwMTgtMDgtMjFUMjA6MzM6MzcuNjY0WiIsImVtYWlsIjoidGVzdEBpbmcuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJpc3MiOiJodHRwczovL2F1cmEtc2xlZXAtYW5hbHlzaXMuZXUuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfDViNzcyMDFiNmZlOTY0NGFiMTQzNzdlZiIsImF1ZCI6IjR1RTFEd0s1QnRueUluTjE0TE8wTGI0Mk5YdHI1TUhDIiwiaWF0IjoxNTM0ODgzNjE3LCJleHAiOjE1MzQ5MTk2MTd9.u01l0rl68DamFQdpZ4nVQxSAj9musRyAHCNuclm9mQums0TWG6HPQmtT6y0zg6fyCgb-gRo05Wf48W3_XdBJD1XMMO8-6Jttdar-H1yLqgx1IjX6kKgL0LiEPlgGX0KQNp22JDgOqWL1S5493IR7IjAZSG95JvsvpYj1H5GqjrPkvv2dPBFgyJzHF4laN7C0jxQh5e47W65tJzExXHraw9Oir6uN9ebL-agKPYCuJQAAvmJgYUYjsLgKhb8kJubmYXlGJ1B6gI_ZBmI1OtMA5BF2boLp7g7agqGSYiKqLQ8eLxYScEWi9HU1m8Dkk1DaaF9wowVMDF6TXhXMtcm6BA';
const Model = require('../protocol');

function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

// amount of sleep +- 15min
const duration = 8 * 60 * 60 - (60 * 60) + getRandomInt(0.5 * 60 * 60);
// samples/s
const freq = 1 / 0.144;

const n = parseInt(duration * freq, 10);

const store = new Array(n);

// schema:
// delta [delta time in mS]
// val [value as Float]

for(let i = 0; i < n; i++){
	store[i] = [
		1000 / freq - 50 + getRandomInt(100),
		parseInt(250 - 150 + getRandomInt(300), 10),
	];
}

const object = {
	dataset: {
		startTime: new Date().getTime(),
		sensorData: [
			{
				SensorType: 'VOC',
				SensorId: 0,
				numSamples: n,
				samples: []
			},
		],
	}
};

for(let i = 0; i < n; i++){
	object.dataset.sensorData[0].samples.push({
		value: {
			voc: store[i][1],
		},
		delta: store[i][0],
	});
}

const buffer = Model.DatasetRequest.encode(object).finish();

const options = {
	method: 'POST',
	url: 'http://localhost:3000/dataset/submit',
	headers: {
		'Postman-Token': '6c2bd464-cc40-4ad4-9e2a-3fbb3b486e22',
		//'Cache-Control': 'no-cache',
		'Content-Type': 'application/x-protobuf',
		Authorization: `Bearer ${token}`,
	},
	body: buffer,
};

request(options, (error, response, body) => {
	if (error) throw new Error(error);
	const message = Model.DatasetResponse.decode(Buffer.from(body));
	console.log(message);
});

console.log(`${n} Samples; length in byte: ${prettyBytes(buffer.byteLength)}`);

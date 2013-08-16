var process = require('process');
var exec = require('child_process').exec;


var args = process.argv;
var channel = args[2];
var videoFormat = args[3];
var videos = [];

for (var i = 4; i < args.length; i++)
	videos.push(args[i]);

console.log('downloading ' + videos + ' from ' + channel);

var cmd = 'youtube-dl -i -f ' + videoFormat + ' -t --no-overwrites ';
for (var i = 0; i < videos.length; i++)
	cmd += 'http://youtube.com/watch?v=' + videos[i] + ' ';

console.log(cmd);

exec(cmd, function(error, stdout, stderr) { 
	if (error) {
		console.log('DOWNLOAD ERROR: ' + error);
		return;
	}

	console.log('DOWNLOAD FINISHED');
});

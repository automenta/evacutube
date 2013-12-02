var _ = require('underscore');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');
var process = require('process');

//Parameters
var channel = 'CHANNEL_NAME'; 
var maxVideos = 1000; //2000
var videoFormat = '5';  //see youtube-dl documentation
var videoExtension = 'flv';
var ftpHost = 'FTP_HOST';
var ftpUser = 'FTP_USER';
var ftpPass = 'FTP_PASSWORD';
var ftpPath = 'FTP_PATH';
var httpURL = 'http://targetwebsite.com/' + ftpPath + '/'; //the HTTP url where the FTP places files
var uploadDelay = 1; //in seconds
var downloadThreads = 6;
//var uploadThreads = 1;  //NOT IMPLEMENTED YET


function xspawn(cmd, args, noStdErr, onFinished) {
	var s = spawn(cmd, args);
	s.stdout.on('data', function (data) {
		console.log('stdout: ' + data);
	});
	if (!noStdErr) {
		s.stderr.on('data', function (data) {
			console.log('stderr: ' + data);
		});
	}
	s.on('close', function (code) {
  		console.log('child process exited with code ' + code);
		if (onFinished)
			onFinished();
	});
	return s;
}

function download(list) {
	var args = [ './../download.js', channel, videoFormat ];
	args = 	args.concat( list );
	xspawn('node', args );
}

function upload() {
	var us = 'curl -g -T "`ls *.' + videoExtension + ' -rt | head -1`" ';
	us += 'ftp://' + ftpHost + '/' + ftpPath + '/ --user ' + ftpUser + ':' + ftpPass + ' ';
	us += '; rm "`ls *.' + videoExtension + ' -rt | head -1`"\n';

	fs.writeFileSync('upload.sh', us);

	function nextUpload() {
		function u() {
			xspawn('bash', [ 'upload.sh' ], true, nextUpload );	
		}
		setTimeout(u, parseInt(uploadDelay * 1000));
	}
	nextUpload();


	return '2';
}


var execOptions = { encoding: 'utf8',
  timeout: 0,
  maxBuffer: 2000*1024,
  killSignal: 'SIGTERM',
  cwd: null,
  env: null };

var gdataFeeds = '';
for (var i = 0; i < Math.ceil(maxVideos / 50); i++) {
	gdataFeeds += 'http://gdata.youtube.com/feeds/api/users/' + channel + '/uploads?max-results=50';
	if (i > 0) {
		gdataFeeds += '&start-index=' + (i*50);
	}
	gdataFeeds += ' ';
}

var gdataFeedsCmd = 'sh ./extractvideos.sh \"' + gdataFeeds + '\"';
var getUploadedURLCmd = 'curl ' + httpURL;

exec(gdataFeedsCmd, execOptions, function(error, stdout, stderr) { 
	if (error) {
		console.log('ERROR: ' + error);
		return;
	}	

	var videos = _.unique( _.filter(stdout.split('\n'), function(v) { return v.length > 0 }) );
	videos = _.map( videos, function(x) {
		return x.substring(x.length - 11, x.length);
	});

	console.log('Total Videos: ' + videos.length);

	exec(getUploadedURLCmd, execOptions, function(error, stdout, stderr) {
		if (error) {
			console.log('ERROR: ' + error);
			return;
		}
		var patt = /<a href="(.*?)"/g;

		var uploadedAlready = [];
		while(match=patt.exec(stdout)){
			var f = match[1];
			if (f.indexOf('.flv')==f.length-4) {
				var c = f.substring(f.length - 15, f.length - 4);
				uploadedAlready.push(c);
			}
		}

		console.log('Uploaded Videos: ' + uploadedAlready.length);

		var unuploaded = _.difference(videos, uploadedAlready);
		console.log('Un-uploaded Videos: ' + unuploaded.length);

		try {
			fs.mkdirSync(channel);
		}
		catch(err) { }

		process.chdir(channel);


		var u = { };
		for (var i = 0; i < unuploaded.length; i++) {
			var ii = i % downloadThreads;
			if (!u[ii])
				u[ii] = [];
			u[ii].push( unuploaded[i] );
		}
		for (var i = 0; i < downloadThreads; i++) {
			download(u[i]);
		}

		upload();
	});
});


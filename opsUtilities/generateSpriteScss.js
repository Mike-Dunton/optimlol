var request = require('request');
var fs = require('fs');

var envContent = fs.readFileSync(__dirname + '/../.env', 'utf8');
var envArray = envContent.split('\n');
var env = {};
envArray.forEach(function(variable) {
	var splitVariable = variable.split('=');
	env[splitVariable[0]] = splitVariable[1].replace(/'/g, '');
});

var _version = null;
var _champions = [];
var _sprites = [];
var versionUrl = "https://na.api.pvp.net/api/lol/static-data/na/v1.2/versions?api_key=" + env.RIOT_API_KEY;
var imagesUrl = "https://na.api.pvp.net/api/lol/static-data/na/v1.2/champion?champData=image&api_key=" + env.RIOT_API_KEY;
var binaryImage = "http://ddragon.leagueoflegends.com/cdn/{{version}}/img/sprite/{{file}}.png";

var _fileBeginning = ".icon-champion-full {\n" +
"\tbackground-image: url('/img/champions.png');\n" + 
"}\n\n" +
".icon-champion-large {\n" +
"\t@extend .icon-champion-full;\n" +
"\theight: 48px;\n" +
"\twidth: 48px;\n" +
"}\n";

var _writeScssFile = function() {
	fs.writeFileSync(__dirname + '/../web/appDependencies/sass/champions.scss', _fileBeginning);

	_champions.forEach(function(champion) {
		console.log(champion);
		var spriteGroup = parseInt(champion.sprite.match(/\d+/)[0]);
		var x = champion.x;
		var y = -1 * champion.y - 48 - (144 * spriteGroup);
		console.log(144 * spriteGroup);

		if (x !== 0) {
			x = x * -1;
		}

		if (spriteGroup === 4) {
			y = 0;
		}

		var data = ".icon-champion-large-" + champion.name +' {\n\t@extend .icon-champion-large;\n\tbackground-position: ' + x + "px " + y + "px;\n}\n";
		fs.appendFileSync(__dirname + '/../web/appDependencies/sass/champions.scss', data);
	});
}

request.get(versionUrl, function(error, result) {
	_version = JSON.parse(result.body)[0].toString();
	console.log(_version);

	request.get(imagesUrl, function(error, result) {
		var champions = JSON.parse(result.body).data;

		for(var champion in champions) {
			var dataNeeded = {};
			var currentChampion = champions[champion];

			dataNeeded.name = currentChampion.key.toLowerCase();
			dataNeeded.sprite = currentChampion.image.sprite;
			dataNeeded.x = currentChampion.image.x;
			dataNeeded.y = currentChampion.image.y;

			if (_sprites.indexOf(currentChampion.image.sprite) === -1) {
				_sprites.push(currentChampion.image.sprite);
			}

			_champions.push(dataNeeded);
		}

		var _sortComparator = function(a, b) {
			if (a.name < b.name) {
				return -1;
			} else if (a.name > b.name) {
				return 1;
			} else {
				return 0;
			}
		}
		_champions.sort(_sortComparator);


		_writeScssFile();
	});
});
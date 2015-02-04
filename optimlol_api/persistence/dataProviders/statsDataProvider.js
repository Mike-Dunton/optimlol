var q = require('q');

module.exports = function() {
	var self = this;
	var _apiVersion = null;
	var _riotApi = null;
	var _mongoCache = null;
	var _logger = null;
	var _performanceCalculator = require('../../common/performanceCalculator');

	var _prepareStats = function(stats) {
		if (stats.data) {
			var optimlolChampions = [];
			stats.data.champions.forEach(function(champion) {
				var optimlolChampion = {};
				optimlolChampion.id = champion.id;
				optimlolChampion.wins = champion.stats.totalSessionsWon;
				optimlolChampion.losses = champion.stats.totalSessionsLost;
				optimlolChampion.kills = champion.stats.totalChampionKills;
				optimlolChampion.deaths = champion.stats.totalDeathsPerSession;
				optimlolChampion.assists = champion.stats.totalAssists;
				if (champion.stats.totalDeathsPerSession) {
					optimlolChampion.kda = (champion.stats.totalChampionKills + champion.stats.totalAssists) / champion.stats.totalDeathsPerSession;
				} else {
					optimlolChampion.kda = (champion.stats.totalChampionKills + champion.stats.totalAssists);
				}
				optimlolChampion.gamesPlayed = champion.stats.totalSessionsPlayed;
				optimlolChampion.performance = _performanceCalculator.calculate(champion.stats.totalSessionsWon, champion.stats.totalSessionsLost);
				optimlolChampions.push(optimlolChampion);
			});

			stats.data.champions = optimlolChampions;
		}

		return stats;
	};

	var _getStatsApi = function(region, summonerId, deferred) {
		if (deferred === undefined) {
			deferred = q.defer();
		}
		var statsPath = region + "/" + _apiVersion + "/stats/by-summoner/" + summonerId + "/ranked";
		_riotApi.makeRequest(region, statsPath)
			.then(function(statsResult) {
				_mongoCache.set('stats', {region: region, summonerId: summonerId}, statsResult)
					.then(function() {
						deferred.resolve(_prepareStats(statsResult));
					})
					.fail(function(error) {
						_logger.warn("Some failure when setting stats cache", error);
						deferred.resolve(_prepareStats(statsResult));
					})
			})
			.fail(function(error) {
				deferred.reject(error);
			});
		return deferred.promise;
	};

	self.getRankedStats = function(region, summonerId) {
		var deferred = q.defer();
		_mongoCache.get('stats', {region: region, summonerId: summonerId})
			.then(function(cacheStatsResult) {
				if (cacheStatsResult.isExpired === false) {
					_logger.debug("Using cached stats.");
					var statsResult = _prepareStats(cacheStatsResult);
					statsResult.data.quality = "fresh"
					deferred.resolve(_prepareStats(cacheStatsResult));
				} else {
					_getStatsApi(region, summonerId)
						.then(function(statsResult) {
							statsResult.data.quality = "fresh";
							deferred.resolve(statsResult);
						})
						.fail(function(RiotFailure){
							_logger.debug("Using cached stats. Because Riot is down");
							var statsResult = _prepareStats(cacheStatsResult);
							statsResult.data.quality = "stale"
							deferred.resolve(statsResult);
						});
				}
			})
			.fail(function(cacheResult) {
				_getStatsApi(region, summonerId, deferred);
			})

		return deferred.promise;
	}

	self.init = function() {
		var _config = require('../../config');
		_apiVersion = _config.riot_api.versions.stats;

		var Logger = require('../../common/logger');
		_logger = new Logger();

		var MongoCache = require('../../common/mongoCache');
		_mongoCache = new MongoCache();

		var RiotApi = require('../../common/riotApi');
		_riotApi = new RiotApi();
		_riotApi.init();
	}
};
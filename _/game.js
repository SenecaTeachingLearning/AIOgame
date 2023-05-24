/************************************************************************
 * ACADEMIC INTEGRITY IN CYBERSPACE
 * Designed and developed by Igor Karasyov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License 3 as published by
 * the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. For more details
 * see <https://www.gnu.org/licenses/gpl-3.0.html>
 ***********************************************************************/

var utils = angular.module('utils', ['ngCookies']),
	app = angular.module('aic', ['ngRoute', 'ngSanitize', 'utils']);

app.config(['$routeProvider', '$locationProvider',
	
	function($routeProvider, $locationProvider) {
		$routeProvider.when('/', {
			templateUrl : '_/tpl/splash.tpl.html',
			controller  : 'splashCtrl'
		}).when('/intro/', {
			templateUrl : '_/tpl/intro.tpl.html',
			controller  : 'introCtrl'
		}).when('/gameinfo/:page?', {
			templateUrl : '_/tpl/gameinfo.tpl.html',
			controller  : 'gameInfoCtrl'
		}).when('/settings/', {
			templateUrl : '_/tpl/settings.tpl.html',
			controller  : 'settingsCtrl'
		}).when('/space/', {
			templateUrl : '_/tpl/space.tpl.html',
			controller  : 'spaceCtrl'
		}).when('/planet/:index?', {
			templateUrl : '_/tpl/planet.tpl.html',
			controller  : 'planetCtrl'
		}).when('/planet/info/:index', {
			templateUrl : '_/tpl/planetinfo.tpl.html',
			controller  : 'planetInfoCtrl'
		}).when('/planet/:index/boss', {
			templateUrl : '_/tpl/boss.tpl.html',
			controller  : 'bossCtrl'
		});
	}
	
]).run(['$rootScope', '$http', '$location', '$storage', '$route', '$interval', '$timeout',
		
	function($rootScope, $http, $location, $storage, $route, $interval, $timeout) {
		
		$rootScope = _.extend($rootScope, {
			intro: [],
			howto: [],
			planets: [],
			tools: [],
			boss: false
		});
		
		$rootScope.gameStarted = false;
		
		$rootScope.aio = _.extend( {
				'uuid': generateUUID(),
				"fullscreen": false,
				"sound": {
					"music": true,
					"speech": true
				},
				"planets" : []
			},
			$storage.getObject(app.name) || {}
		);
		
		$rootScope.saveState = function() {
			$storage.setObject(app.name, $rootScope.aio);
		};
		
		arrayFillMethod();

		$http.defaults.cache = true;
		$http.get('_/game_data.json')
			.success(function(data, status, headers, config) {
				$rootScope.gameinfo = data.gameinfo;
				$rootScope.intro = data.intro;
				$rootScope.planets = data.planets;
				$rootScope.tools = data.tools;
				$rootScope.scenes = data.scenes;
				$rootScope.characters = data.characters;
				$rootScope.assetsLoaded = false;
				$rootScope.imagesProgress = 'Loading...';
				_.each($rootScope.planets, function(planet, planetIndex, planets) {
					var scenes = _.where($rootScope.scenes, {planet: planetIndex});
					
					if (!$rootScope.aio.planets[planetIndex]) {
						$rootScope.aio.planets.push({
							name: planet.name,
							completed: false,
							status: 0,
							allegiance: new Array(scenes.length).fill(0),
							currentCharacter: 0,
							currentScene: 0,
							toolsUsed: 0
						});
					}
				});
				$rootScope.saveState();
				loadIntroAssets();
			})
			.error(function(data, status, headers, config) {
				console.log('error: ' + status);
			});
				
		$rootScope.setLocation = function(path) {
			$location.path(path).replace();
		};
		
		$rootScope.openSettings = function() {
			if (window.voiceSound) { 
				window.voiceSound.stop();
			}
			$rootScope.makeClickSound();
			$rootScope.returnPath = $location.$$url;
			$rootScope.setLocation('/settings');
		}
		
		$rootScope.closeSettings = function() {
			$rootScope.makeClickSound();
			if ($rootScope.returnPath) {
				$rootScope.setLocation($rootScope.returnPath);
				$rootScope.returnPath = "";
			} else {
				$rootScope.setLocation('/space');
			}
		}
		
		$rootScope.openLocation = function(path) {
			if (window.voiceSound) { 
				window.voiceSound.stop();
			}
			$rootScope.makeClickSound();
			if (!$rootScope.returnPath) {
				$rootScope.returnPath = $location.$$url;
			}
			$rootScope.setLocation(path);
		}
		
		$rootScope.closeLocation = function() {
			$rootScope.makeClickSound();
			if ($rootScope.returnPath) {
				$rootScope.setLocation($rootScope.returnPath);
				$rootScope.returnPath = undefined;
			} else {
				$rootScope.setLocation('/space');
			}
		}
		
		function loadIntroAssets() {
			var queue, imgArray, sounds, loadingProgress;
			queue = new createjs.LoadQueue();
			queue.installPlugin(createjs.Sound);
			assets = [];
			sounds = [
				{id:"space", src:"_/snd/ambient.mp3"},
				{id:"click", src:"_/snd/click.mp3"},
				{id:"cheer", src:"_/snd/cheer.mp3"},
				{id:"boo", src:"_/snd/boo.mp3"},
				{id:"laughter", src:"_/snd/laughter.mp3"},
				{id:"anger", src:"_/snd/anger.mp3"},
				{id:"victory", src:"_/snd/cheer.mp3"},
				{id:"chat", src:"_/snd/chat_call.mp3"}
			];
			_.each($rootScope.intro, function(el, ind, list) {
				assets.push({id: "intro_" + ind, src: el.image});
			});
			_.each($rootScope.planets, function(el, ind, list) {
				assets.push({id: "planet_" + ind, src: el.image.normal});
				assets.push({id: "planet_" + ind + "_dark", src: el.image.dark});
			});
			assets.push({id: "boss", src: "_/img/boss.png"});
			assets = assets.concat(sounds);
			queue.on("complete", function() { 
				$rootScope.introAssetsLoaded = true;
				$rootScope.$apply();
				$rootScope.focusElement("#btnStart");
			}, this);
			$rootScope.loaded = 0;
			
			loadingProgress = $interval(function() {
				$rootScope.loaded = queue.progress;
				if (queue.progress >= 1 && angular.isDefined(loadingProgress)) {
					$interval.cancel(loadingProgress);
					$rootScope.loaded = 1;
					loadingProgress = null;
				}
			});
			queue.loadManifest(assets);
		}
		
		$rootScope.loadPlanetAssets = function(n) {
			var queue, planet, scenes, assets, loadingProgress;
			
			queue = new createjs.LoadQueue();
			queue.installPlugin(createjs.Sound);
			planet = $rootScope.planets[n];
			scenes = _.where($rootScope.scenes, {planet: n});
			assets = [];
			assets.push({id: "landscape_day_" + n, src: planet.background.day});
			assets.push({id: "landscape_night_" + n, src: planet.background.night});
			if(planet.music.length) {
				assets.push({id: planet.name, src: planet.music});
			}
			_.each(scenes, function(scene, ind) {
				_.each(scene.characters, function(c, i) {
					assets.push({id: "alien_" + i, src: c.image});
				});
				_.each(scene.conversation, function(q) {
					if (q.voiceover > '') {
						assets.push({ id: scene.planet + "_" +"_scene" + ind + "_" + q.id, src: q.voiceover});
					};
				});
				_.each(scene.boss, function(q, i) {
					if (q.voiceover > '') {
						assets.push({ id: scene.planet + "_scene" + ind + "_boss" + i, src: q.voiceover});
					};
				});
			});
			queue.on("complete", function() {
				planet.assetsLoaded = true;
				$rootScope.$apply();
			}, this);
			
			$rootScope.loaded = 0;
			
			loadingProgress = $interval(function() {
				$rootScope.loaded = queue.progress;
				if (queue.progress >= 1 && angular.isDefined(loadingProgress)) {
					$interval.cancel(loadingProgress);
					$rootScope.loaded = 1;
					loadingProgress = null;
				}
			});
			
			queue.loadManifest(assets);
		}
		
		$rootScope.makeClickSound = function() {
			if (window.clickSound) { 
				window.clickSound.play();
			} else {
				window.clickSound = createjs.Sound.play('click', {volume: 0.1});
			}
		};
		
		$rootScope.ambientSoundName = 'space';
		
		$rootScope.playAmbientSound = function(reload) {
			var props = new createjs.PlayPropsConfig().set({
				loop: -1, 
				volume: 0.01
			});
			if(window.ambientSound) {
				if(reload) {
					//console.log('reload');
					window.ambientSound.stop();
					window.ambientSound = null;
					window.ambientSound = createjs.Sound.play($rootScope.ambientSoundName, props);
				} else {
					//console.log('resume');
					window.ambientSound.play();
				}
			} else {
				//console.log('load');
				window.ambientSound = createjs.Sound.play($rootScope.ambientSoundName, props);
			}
		};
		
		$rootScope.stopAmbientSound = function() {
			if (window.ambientSound) {
				window.ambientSound.stop();
			}
		};
		
		$rootScope.toggleMusic = function(event) {
			
			$rootScope.makeClickSound();
			
			if(event.type == 'click' || event.keyCode == 13 || event.keyCode == 32) {
			
				if($rootScope.aio.sound.music) {
					$rootScope.stopAmbientSound();
				} else if($rootScope.ambientSoundName.length) {
					$rootScope.playAmbientSound(true);
				}
				$rootScope.aio.sound.music = !$rootScope.aio.sound.music;
				$rootScope.saveState();
			}
		}
		
		$rootScope.toggleSpeech = function(event) {
			
			$rootScope.makeClickSound();
			
			if(event.type == 'click' || event.keyCode == 13 || event.keyCode == 32) {
			
				$rootScope.aio.sound.speech = !$rootScope.aio.sound.speech;
				$rootScope.saveState();
			}
		}
		
		$rootScope.focusElement = function(selector) {
			$timeout( function(){
				if (typeof selector == 'string') {
					$(selector).focus();
				} else {
					selector.focus();
				}
			}, 300);
		};
		
		$rootScope.toggleDialogFocus = function(overlay, show) {
			var $overlay;
			$overlay = $(overlay);
			if ( show ) {
				$rootScope.focusElement( $overlay.find('.dialog') );
				$rootScope.trapFocus(overlay);
			}
		};
		
		$rootScope.trapFocus = function(overlay){
			overlay = document.querySelector(overlay);
			if (overlay) {
				$rootScope.focusable = overlay.querySelectorAll("button, a, *[tabindex]");
				$rootScope.focusFirst = $rootScope.focusable[0];
				$rootScope.focusLast = $rootScope.focusable[$rootScope.focusable.length - 1];
				
				overlay.addEventListener("keydown", function(event) {
					if (event.key === "Tab" || event.keyCode === 9) {
						
						if(event.shiftKey) {
							if (document.activeElement === $rootScope.focusFirst) {
								$rootScope.focusLast.focus();
								event.preventDefault();
							}
						} else {
							if (document.activeElement === $rootScope.focusLast) {
								$rootScope.focusFirst.focus();
								event.preventDefault();
							}
						}
					}
				});
			}
		};
		
		$rootScope.playSound = function(snd) {
			if (snd == 'click') {
				$rootScope.makeClickSound();
			} else if (snd == 'chat') {
				if (window.chatSound) {
					window.chatSound.play();
				} else {
					let props = {
						volume: 0.1,
						loop: -1
					}
					window.chatSound = createjs.Sound.play(snd, props);
				}
			} else if ($rootScope.aio.sound.speech && snd > '') {
				window.voiceSound = createjs.Sound.play(snd, { volume: 1.0 });
			}
		}
		
		$rootScope.stopSound = function(snd) {
			switch(snd) {
				case 'chat':
					if (window.chatSound) {
						window.chatSound.stop();
					}
					break;
				default:
					if (window.voiceSound) {
						window.voiceSound.stop();
					}
					break;
			}
		}
		
	}
	
]);

app.controller('splashCtrl', ['$rootScope', '$scope', '$location', '$timeout',
	function($rootScope, $scope, $location, $timeout) {
		
		$rootScope.gameStarted = true;
		
		$scope.startGame = function() {
			$rootScope.makeClickSound();
			$rootScope.loaded = 0;
			$location.path("/intro/");
		};
		
	}
]);

app.controller('introCtrl', ['$rootScope', '$scope', '$location', '$storage', '$route',
	function($rootScope, $scope, $location, $storage, $route) { 
		
		var current = 0;
			
		if (!$rootScope.introAssetsLoaded) {
			$location.path('/');
		} else {
			
			$rootScope.ambientSoundName = 'space';
			if($rootScope.aio.sound.music) {
				$rootScope.playAmbientSound(true);
			}
			$scope.background = $rootScope.intro[current].image;
			$scope.message = $rootScope.intro[current].text;
			$scope.label = current == $rootScope.intro.length - 1 ? "Start" : "Next";
			
			$scope.continueGame = function() {
				
				$rootScope.makeClickSound();
				
				if(current < $rootScope.intro.length - 1) {
					++current;
					$scope.background = $rootScope.intro[current].image;
					$scope.message = $rootScope.intro[current].text;
					$rootScope.focusElement("#txtIntro");
				} else {
					$location.path('/space/');
				}
				$scope.label = current == $rootScope.intro.length - 1 ? "Start" : "Next";
			};
			
			$rootScope.focusElement("#txtIntro");
		}	
	}
]);

app.controller('gameInfoCtrl', ['$rootScope', '$scope', '$location', '$storage', '$route', '$sce',
	function($rootScope, $scope, $location, $storage, $route, $sce) {
		
		var n = $route.current.pathParams.page;
		
		$scope.discussionGuideHtml = '#/';
		
		if (!$rootScope.introAssetsLoaded ||
			!isNaN(n) || 
			!n.length) {
			
			$location.path('/');
		} else {
			$scope.page = $rootScope.gameinfo[n];
			$scope.trustedHtml = $sce.trustAsHtml($scope.page.content);
			$rootScope.focusElement('.message');
		}
		
	}
]);

app.controller('settingsCtrl', ['$rootScope', '$scope', '$location', '$timeout', '$sce',
	function($rootScope, $scope, $location, $timeout) {
		
		if (!$rootScope.introAssetsLoaded) {
			$location.path('/');
		} else {
			$rootScope.focusElement('#dlgMenu');
		}
	}
]);

app.controller('spaceCtrl', ['$rootScope', '$scope', '$location', '$storage',
	function($rootScope, $scope, $location, $storage) { 
		
		if (!$rootScope.introAssetsLoaded) {
			$location.path('/');
		} else {
			
			$rootScope.planets.forEach((p) => {
				const saved = $rootScope.aio.planets.find(s => s.name === p.name);
				p.status = saved.status;
				
			})
			// console.log($rootScope.planets);
			$scope.selectPlanet = function(event, index) {
				
				if(event.type === 'click' || event.keyCode === 13 || event.keyCode == 32) {
					$rootScope.makeClickSound();
					if (window.spaceSound) { 
						window.spaceSound.stop();
					}
					$location.path('/planet/info/' + index);
				}
			};
			
			$rootScope.focusElement("#lstPlanets");
		}
	}
]);

app.controller('planetInfoCtrl', ['$rootScope', '$scope', '$location', '$storage', '$route', '$timeout',
	function($rootScope, $scope, $location, $storage, $route, $timeout) { 
		
		var snd,
			current = 0,
			hasCharacters;
		
		$scope.planetIndex = parseInt($route.current.pathParams.index);
		$scope.hasCharacters = !!_.findWhere($rootScope.scenes, {planet: $scope.planetIndex});
		$rootScope.loaded = 0;
		
		if (!$rootScope.introAssetsLoaded ||
			!$rootScope.planets.length ||
			isNaN($scope.planetIndex) ||
			$scope.planetIndex < 0 ||
			$scope.planetIndex > $rootScope.planets.length) {
					
			$location.path("/space/");
		} else {
			
			if (!$rootScope.planets[$scope.planetIndex].assetsLoaded) {
				$rootScope.loadPlanetAssets($scope.planetIndex);
			} else {
				$rootScope.loaded = 1;
			}
			
			$scope.completed = $rootScope.aio.planets[$scope.planetIndex].completed;
			$scope.status = $rootScope.aio.planets[$scope.planetIndex].status;
			$scope.planet = $rootScope.planets[$scope.planetIndex];
			$scope.characters = _.where($rootScope.characters, {planet: $scope.planetIndex});
			$scope.scenes = _.where($rootScope.scenes, {planet: $scope.planetIndex});
			$scope.label = $scope.hasCharacters ? ( $rootScope.aio.planets[$scope.planetIndex].completed ? "Replay": "Continue" ) : "Close";
			
			switch($rootScope.aio.planets[$scope.planetIndex].status) {
				case 0:
					$scope.planetinfo = $scope.planet.info;
					break;
				case 1:
					$scope.planetinfo = $scope.planet.summary.victory.message;
					break;
				case -1:
					$scope.planetinfo = $scope.planet.summary.defeat.message;
					break;
				
			}
		}
		
		$scope.continueGame = function() {
			
			$rootScope.makeClickSound();
						
			if ($scope.completed) {
				_.extend($rootScope.aio.planets[$scope.planetIndex], {
					completed: false,
					status: 0,
					allegiance: new Array($scope.scenes.length).fill(0),
					currentCharacter: 0,
					currentScene: 0,
					toolsUsed: 0
				});
				_.each($rootScope.scenes, function(scene) {
					scene.allegiance = 0;
				});
				$rootScope.saveState();
				$rootScope.stopAmbientSound();
				$location.path('/planet/' + $scope.planetIndex);
			} else if ($scope.hasCharacters) {
				/* $rootScope.ambientSoundName = $scope.planet.name;
				if($rootScope.aio.sound.music) {
					$rootScope.playAmbientSound(true);
				}*/
				$rootScope.stopAmbientSound();
				$location.path('/planet/' + $scope.planetIndex);
			} else {
				$location.path('/space/');
			}
			
		};
		
		$scope.exitPlanet = function() {
			$rootScope.makeClickSound();
			$location.path("/space/");
		};
		
		$rootScope.focusElement("#txtPlanetInfo");
	}
]);

app.controller('planetCtrl', ['$rootScope', '$scope', '$location', '$storage', '$route', '$timeout', '$sce',
	function($rootScope, $scope, $location, $storage, $route, $timeout, $sce) {
		
		$scope.planetIndex = parseInt($route.current.pathParams.index)
		$scope.feedback = {
			message: "",
			classname: ""
		};
		$scope.currentHint = {
			message: ""
		}
		$scope.directiveAPI = {};
		$scope.getNextScene = false;
		$scope.isChatHidden = true;
		
		if (!$rootScope.planets.length ||
			isNaN($scope.planetIndex) ||
			$scope.planetIndex < 0 ||
			$scope.planetIndex > $rootScope.planets.length ||
			!$rootScope.planets[$scope.planetIndex].assetsLoaded) {
			$location.path("/space/");
		} else if ( _.indexOf($rootScope.aio.planets[$scope.planetIndex].allegiance, 0) < 0 ) {
			$location.path('/planet/' + $scope.planetIndex + '/boss');
		} else {		
			let planetState = $rootScope.aio.planets[$scope.planetIndex];
			$scope.planet = $rootScope.planets[$scope.planetIndex];
			$scope.scenes = _.where($rootScope.scenes, {planet: $scope.planetIndex});
			$scope.sceneIndex = planetState.currentScene > $scope.scenes.length ? 0 : planetState.currentScene;
			_.each($scope.scenes, function(scene, index) {
				scene.allegiance = planetState.allegiance[index];
			});
			$scope.currentScene = $scope.scenes[$scope.sceneIndex];
			if ($scope.currentScene.type=='chat' && $scope.isChatHidden) {
				$rootScope.focusElement("#btnOpenChat");
			} else {
				$rootScope.focusElement("#txtSpeechBalloon");
			}
			setBackground();
		}
		
		$scope.closeFeedback = function() {
			$rootScope.makeClickSound();
			$scope.feedback = {
				"message": "",
				"classname": ""
			};
			$scope.currentHint.message = "";
			if ($scope.getNextScene) {
				let planetState = $rootScope.aio.planets[$scope.planetIndex];
				planetState.allegiance[$scope.sceneIndex] = $scope.currentScene.allegiance;
				$scope.isChatHidden = true;
				if ($scope.sceneIndex < $scope.scenes.length - 1) {
					$scope.sceneIndex++;
					$scope.currentScene = $scope.scenes[$scope.sceneIndex]
					planetState.currentScene = $scope.sceneIndex;
					if ($scope.currentScene.type=='chat' && $scope.isChatHidden) {
						$rootScope.focusElement("#btnOpenChat");
					} else {
						$rootScope.focusElement("#txtSpeechBalloon");
					}
					setBackground();
					$rootScope.saveState();
				} else {
					let summary;
					const goodArmy = _.where($scope.scenes, {allegiance: 1});
					const evilArmy = _.where($scope.scenes, {allegiance: -1});
					if (planetState.completed) { 									/* planet is done */
						$location.path('/space/');
						$rootScope.ambientSoundName = "space";
						if ($rootScope.aio.sound.music) {
							$rootScope.playAmbientSound(true);
						}
					} else if ($scope.scenes.length == goodArmy.length) { 	/* victory */
						summary = $scope.planet.summary;
						$scope.feedback = {
							"image": summary.victory.image,
							"message": summary.victory.message,
							"classname": "victory"
						};
						planetState.currentScene = 0;
						planetState.status = 1;
						planetState.completed = true;
						$rootScope.saveState();
					} else if($scope.scenes.length == evilArmy.length) { 	/* defeat */
						summary = $scope.planet.summary;
						$scope.feedback = {
							"image": summary.defeat.image,
							"message": summary.defeat.message,
							"classname": "defeat"
						};
						planetState.currentScene = 0;
						planetState.status = -1;
						planetState.completed = true;
						$rootScope.saveState();
					} else { 														/* boss battle */
						$location.path('/planet/' + $scope.planetIndex + '/boss');
					}
				}
			} else {
				$scope.directiveAPI.alien.nextQuestion();
			}
		};
		
		$scope.closeHints = function() {
			$rootScope.makeClickSound();
			$scope.currentHint.message = "";
			$rootScope.focusElement("#txtSpeechBalloon");
		}
		
		$scope.exitPlanet = function() {
			$rootScope.stopSound();
			$rootScope.makeClickSound();
			$scope.getNextScene = false;
			$location.path("/planet/info/" + $scope.planetIndex);
			$rootScope.ambientSoundName = "space";
			if(window.chatSound) {
				window.chatSound.stop();
			}
			if($rootScope.aio.sound.music) {
				$rootScope.playAmbientSound(true);
			}
		};
		$scope.openChat = function() {
			$scope.isChatHidden = false;
			$rootScope.stopSound('chat');
			$rootScope.focusElement("#chatMessages");
		};
		function setBackground() {
			$scope.bgImage = _.random(0, 1) ? $scope.planet.background.night : $scope.planet.background.day
			// $scope.bgPosition = _.random(-50, 0);
			let alignments = ['flex-start', 'center', 'flex-end'];
			let pos = _.random(0, 2);
			$scope.bgPosition = alignments[pos];
			if ($scope.currentScene.type == 'chat') {
				$timeout(function() {
					$rootScope.playSound('chat');
				}, 500);
			}
		}
		
	}
]);

app.directive('alien', ["$timeout",
	function ($timeout) {
		return {
			restrict: 'AE',
			replace: true,
			scope: {
				scene: '=',
				feedback: '=',
				hint: '=',
				api: '=',
				sceneEnded: '=',
				soundPlay: '&',
				soundStop: '&'
			},
			link: function ($scope, $elem, attrs) {
				$scope.$watch('scene', function(newValue, oldValue) {
					if (!oldValue || oldValue.id !== newValue.id) {
						loadScene(newValue);
					}
				}, true);
				
				loadScene($scope.scene);
				
				$scope.verifyAnswer = function(index, option) {
					let message = '';
					$scope.soundStop();
					$scope.soundPlay({snd: 'click'});
					$scope.nextQuestionId = option.next;
					
					if (option.feedback.length) {
						if(!$scope.nextQuestionId) {
							let primaryCharacter = _.find($scope.scene.characters, {primary: true});
							if (option.correct) {
								message =  `<div class="join_army" role="presentation">
												<div>
													<img src="${primaryCharacter.image}" alt="${primaryCharacter.name}">
												</div>
												<img class="join_arrow" src="_/img/join_arrow.png" alt=" ">
												<div>
													<img src="_/img/alien_16.png" alt="You">
												</div>
											</div>
											<h1>You saved ${primaryCharacter.name} from Captain Corruptus's Army of the Unearned.</h1>`;
								$scope.scene.allegiance = 1;
								if (window.cheerSound) {
									window.cheerSound.play();
								} else {
									window.cheerSound = createjs.Sound.play('cheer');
								}
							} else {
								message = `<div class="join_army lose" role="presentation">
												<div>
													<img src="${primaryCharacter.image}" alt="${primaryCharacter.name}">
												</div>
												<img class="join_arrow" src="_/img/join_arrow.png" alt=" ">
												<div>
													<img src="_/img/boss_avatar.png" alt="Captain Corruptus">
												</div>
											</div>
											<h1>${primaryCharacter.name} has joined Captain Corruptus's Army of the Unearned.</h1>`;
								$scope.scene.allegiance = -1;
								if (window.booSound) {
									window.booSound.play();
								} else {
									window.booSound = createjs.Sound.play('boo');
								}
							}
							$scope.sceneEnded = true;
						}
						$scope.feedback = {
							"message": message + option.feedback,
							"image": "",
							"classname": ""
						};
						focusElement("#txtFeedbackBalloon");
					} else {
						$scope.getNextQuestion();
					}
				};
				$scope.getHint = function() {
					$scope.soundPlay({snd: 'click'});
					$scope.hint.message = $scope.currentQuestion.hints[0];
					focusElement("#txtHintBalloon");
				}
				$scope.getNextQuestion = function() {
					$scope.currentQuestion = null;
					$timeout(function () {
						if ($scope.nextQuestionId) {
							$scope.currentQuestion = _.findWhere($scope.scene.conversation, {id: $scope.nextQuestionId});
							$scope.soundPlay({snd: $scope.currentQuestion.voiceover});
							focusElement("#txtSpeechBalloon");
						} else {
							$scope.sceneEnded = true;
						}
					}, 300);
				}
				$scope.api[attrs.id] = {
					nextQuestion: function() {
						$scope.getNextQuestion();
					}
				}
				function loadScene(s) {
					$scope.scene = s;
					if ($scope.scene) {
						$scope.currentCharacter = $scope.scene.characters[0];
						$scope.currentQuestion = $scope.scene.conversation[0];
						$scope.nextQuestionId = 1;
						$scope.sceneEnded = false;
						focusElement("#txtSpeechBalloon");
						$scope.soundPlay({snd: $scope.currentQuestion.voiceover});
					}
				}
				function focusElement (selector) {
					$timeout(function () {
						if (typeof selector === 'string') {
							$(selector).focus();
						} else {
							selector.focus();
						}
					}, 300);
				}
			},
			templateUrl:'_/tpl/alien.tpl.html'
		}
	}
]);

app.directive('chat', ["$timeout",
	function ($timeout) {
		return {
			restrict: 'AE',
			replace: true,
			scope: {
				scene: '=',
				feedback: '=',
				hint: '=',
				api: '=',
				chatHidden: '=',
				sceneEnded: '=',
				soundPlay: '&',
				soundStop: '&'
			},
			link: function ($scope, $elem, attrs) {
				
				$scope.messages = [];
				$scope.timer = null;
				
				function loadScene(s) {
					$scope.scene = s;
					if ($scope.scene) {
						$scope.messages = [];
						$scope.sceneEnded = false;
						$scope.nextQuestionId = 1;
						$scope.currentQuestion = _.findWhere($scope.scene.conversation, {id: $scope.nextQuestionId});
						$scope.currentCharacter = $scope.scene.characters[$scope.currentQuestion.character];
						$scope.postMessage();
						loadNextQuestion();
					}
				}
				function loadNextQuestion() {
					if ($scope.nextQuestionId) {
						$scope.currentQuestion = _.findWhere($scope.scene.conversation, {id: $scope.nextQuestionId});
						$scope.currentCharacter = $scope.scene.characters[$scope.currentQuestion.character];
						/* $timeout.cancel($scope.timer);
						$scope.timer = $timeout(postMessage, 3000); */
					}
				}
				$scope.postMessage = function() {
					let message = {
						character: {
							id: $scope.currentQuestion.character,
							name: $scope.currentCharacter.name,
							image: $scope.currentCharacter.image
						},
						question: {
							question: $scope.currentQuestion.question,
							options: $scope.currentQuestion.options,
							current: true,
							next: $scope.currentQuestion.next
						}
					};
					$scope.messages.map( (msg) => msg.question.current = false );
					$scope.messages.push(message);
					$scope.soundPlay({snd: 'click'});
					focusElement('#chatMessages');
					if (message.question.next) {
						$scope.nextQuestionId = message.question.next;
						loadNextQuestion();
					}  else if (!message.question.options.length) {
						// exit scene?
						console.log('exit scene');
					}
				}
				$scope.verifyAnswer = function(option) {
					$scope.soundStop();
					$scope.soundPlay({snd: 'click'});
					$scope.nextQuestionId = option.next;
					let you = $scope.scene.characters[0];
					let message = {
						character: {
							id: 0,
							name: you.name,
							image: you.image
						},
						question: {
							question: option.label,
							options: [],
							current: true,
							next: $scope.nextQuestionId
						}
					};
					$scope.messages[$scope.messages.length - 1].question.options = [];
					$scope.messages.map( (msg) => msg.question.current = false );
					$scope.messages.push(message);
					if ($scope.nextQuestionId) {
						loadNextQuestion();
						focusElement('#chatMessages');
					} else {
						let primaryCharacter = _.find($scope.scene.characters, {primary: true});
						if (option.correct) {
							message =  `<div class="join_army" role="presentation">
											<div>
												<img src="${primaryCharacter.image}" alt="${primaryCharacter.name}">
											</div>
											<img class="join_arrow" src="_/img/join_arrow.png" alt=" ">
											<div>
												<img src="_/img/alien_16.png" alt="You">
											</div>
										</div>
										<h1>You saved ${primaryCharacter.name} from Captain Corruptus's Army of the Unearned.</h1>`;
							$scope.scene.allegiance = 1;
							if (window.cheerSound) {
								window.cheerSound.play();
							} else {
								window.cheerSound = createjs.Sound.play('cheer');
							}
						} else {
							message = `<div class="join_army lose" role="presentation">
											<div>
												<img src="${primaryCharacter.image}" alt="${primaryCharacter.name}">
											</div>
											<img class="join_arrow" src="_/img/join_arrow.png" alt=" ">
											<div>
												<img src="_/img/boss_avatar.png" alt="Captain Corruptus">
											</div>
										</div>
										<h1>${primaryCharacter.name} has joined Captain Corruptus's Army of the Unearned.</h1>`;
							$scope.scene.allegiance = -1;
							if (window.booSound) {
								window.booSound.play();
							} else {
								window.booSound = createjs.Sound.play('boo');
							}
						}
						focusElement('#txtFeedbackBalloon');
						$scope.sceneEnded = true;
						$scope.feedback = {
							"message": message + option.feedback,
							"image": "",
							"classname": ""
						};
					}
				}
				$scope.$watch('chatHidden', function(newValue, oldValue) {
					if (newValue === false) {
						loadScene($scope.scene);
					}
				}, true);
				
				loadScene($scope.scene);
				
				$scope.api[attrs.id] = {
					openChat: function() {
						$elem.addClass('visible');
					}
				}
				function focusElement (selector) {
					$timeout(function () {
						if (typeof selector === 'string') {
							$(selector).focus();
						} else {
							selector.focus();
						}
					}, 300);
				}
			},
			templateUrl: '_/tpl/chat.tpl.html'
		}
	}
]);

app.controller('bossCtrl', ['$rootScope', '$scope', '$location', '$storage', '$route', '$timeout',
	function($rootScope, $scope, $location, $storage, $route, $timeout) {
		
		var n, planetState, snd, currentIndex, timerQuestion, questions;
		
		$rootScope.stopAmbientSound();
		
		n = parseInt($route.current.pathParams.index);
		
		if (!$rootScope.introAssetsLoaded ||
			!$rootScope.planets.length ||
			isNaN(n) ||
			n < 0 ||
			n > $rootScope.planets.length) {
			$location.path("/space/");
		} else {
			planetState = $rootScope.aio.planets[n];
			$scope.planet = $rootScope.planets[n];
			$scope.planetIndex = n;
			$scope.scenes = _.where($rootScope.scenes, {planet: n});
			_.each($scope.scenes, function(sc, index, list) {
				sc.allegiance = planetState.allegiance[index];
			});
			let lostScenes = _.where($scope.scenes, {allegiance: -1});
			$scope.questions = _.map(lostScenes, function(item) {
				return item.boss[0];
			});
			$scope.attempts = Math.floor($scope.scenes.length / 2);
		}
		
		currentIndex = 0;
		$scope.completed = false;
		$scope.feedback = {
			"image": "",
			"message": "<h2>You've lost some students to Captain Corruptus's League of the Unearned. Fear not, you can still save them and the planet by battling Captain Corruptus directly!</h2>",
			"classname": "bossintro"
		};
		$rootScope.focusElement('#txtBossFeedback');
		if (window.angerSound) {
			window.angerSound.play();
		} else {
			window.angerSound = createjs.Sound.play('anger');
		}
		
		$scope.verifyAnswer = function(index, option) {
			var ind;
			$rootScope.stopSound();
			$rootScope.makeClickSound();
			if (option.correct) {
				ind = _.findIndex($scope.scenes, {allegiance: -1});
				$scope.scenes[ind].allegiance = 1;
				if (window.angerSound) {
					window.angerSound.play();
				} else {
					window.angerSound = createjs.Sound.play('anger');
				}
			} else {
				ind = _.findLastIndex($scope.scenes, {allegiance: 1})
				$scope.scenes[ind].allegiance = -1;
				if (window.laughterSound) {
					window.laughterSound.play();
				} else {
					window.laughterSound = createjs.Sound.play('laughter');
				}
			}
			
			planetState.allegiance = _.map($scope.scenes, function(item) { return item.allegiance });
			$rootScope.saveState();
			
			$scope.attempts--;
			currentIndex++;
			
			if (option.feedback.length) {
				// show feedback
				$scope.feedback = {
					"image": "",
					"message": option.feedback,
					"classname": ""
				};
				$rootScope.focusElement('#txtBossFeedback');
			} else {
				$scope.currentQuestion = {};
				timerQuestion = $timeout($scope.goNext, 500);
			}
		};
		
		$scope.goNext = function() {
			let scene;
			
			if (!$scope.attempts || _.indexOf(planetState.allegiance, 1) < 0 || _.indexOf(planetState.allegiance, -1) < 0) {
				showSummary();
			} else {
				let ind = _.findIndex($scope.scenes, {allegiance: -1});
				scene = $scope.scenes[ind];
				$scope.currentQuestion = scene.boss[0];
				$rootScope.playSound($scope.currentQuestion.voiceover);
				$rootScope.focusElement("#bossQuestion");
			}
		}
		
		$scope.closeFeedback = function() {
			$rootScope.makeClickSound();
			$rootScope.focusElement('#txtBossFeedback');
			$scope.feedback = {
				"image": "",
				"message": "",
				"classname": ""
			};
			if ($scope.completed) {
				$rootScope.ambientSoundName = 'space';
				if($rootScope.aio.sound.music) {
					$rootScope.playAmbientSound(true);
				}
				$location.path("/space/");
			} else {
				$scope.currentQuestion = {};
				timerQuestion = $timeout($scope.goNext, 500);
			}
		};
		
		function showSummary () {
			var summary;
			
			$rootScope.focusElement('#txtBossFeedback');
			
			summary = $scope.planet.summary;
			const goodArmy = _.where($scope.scenes, {allegiance: 1});
			const evilArmy = _.where($scope.scenes, {allegiance: -1});
			
			if (goodArmy.length < evilArmy.length) {
				
				$scope.feedback = {
					"image": summary.defeat.image,
					"message": summary.defeat.message,
					"classname": "defeat"
				};
				planetState.completed = true;
				planetState.status = -1;
				$rootScope.saveState();
				
			} else {
				
				$scope.victory = true;
				$scope.feedback = {
					"image": summary.victory.image,
					"message": summary.victory.message,
					"classname": "victory"
				};
				planetState.completed = true;
				planetState.status = 1;
				$rootScope.saveState();
				
				if (window.victorySound) {
					window.victorySound.play();
				} else {
					window.victorySound = createjs.Sound.play('victory');
				}
				planetState.currentCharacter = 0;
			}
			$scope.completed = true;
			$rootScope.saveState();
		};
		
	}
]);

app.directive('armies', [function() {
	return {
		restrict: 'AE',
		replace: true,
		scope: {
			scenes: '=',
			attempts: '='
		},
		link: function ($scope, $elem, attrs) {
			
			$scope.getPrimaryCharacter = function(scene) {
				let ch = scene.characters.find(c => c.primary);
				return ch;
			}
		},
		templateUrl:'_/tpl/score.tpl.html'
	}
}]);

app.controller('multitextCtrl', ['$rootScope', '$scope', '$location',
	function($rootScope, $scope, $location) {}
]).directive('multitext', [
	function () {
		return {
			restrict: 'AE',
			replace: true,
			scope: {
				textArray: '=textarray'
			},
			link: function ($scope, $elem, attrs) {
				
				$scope.first = 0;
				$scope.last = $scope.textArray.length - 1;
				$scope.current = 0;
				
				$scope.next = function () {
					
					$scope.$root.makeClickSound();
					
					$scope.ngModel = $scope.ngModel ? $scope.ngModel : ($scope.current == $scope.last - 1);
					if ($scope.current < $scope.last) {
						$scope.current++;
					}
				}
				$scope.prev = function () {
					
					$scope.$root.makeClickSound();
					
					if ($scope.current > $scope.first) {
						$scope.current--;
					}
				}
			},
			templateUrl:'_/tpl/multitext.tpl.html'
		}
	}
]);

app.directive('scrollToBottom', ['$timeout', function ($timeout) {
	return {
		scope: {
			scrollToBottom: "="
		},
		link: function ($scope, $element) {
			$scope.$watchCollection('scrollToBottom', function (newValue) {
				if (newValue) {
					$timeout(function(){
						const el = $element[0];
						el.scroll({top: el.scrollHeight, behavior: "smooth"});
					}, 0);
				}
			});
		}
	}
}]);

///*  UTILS  *///

utils.factory('$storage', ['$window', '$cookies', function($window, $cookies) {
	var expiry_days = 10;
	
	function isLocalStorageAvailable() {
		var str = 'test';
		try {
			localStorage.setItem(str, str);
			localStorage.removeItem(str);
			return true;
		} catch(e) {
			return false;
		}
	}

	return {
		set: function(key, value) {
			var d = new Date();
			if (isLocalStorageAvailable()) {
				$window.localStorage[key] = value;
			} else {
				$cookies(key, value, {expires: d.setDate(expiry_days)});
			}
		},
		get: function(key) {
			var r = (isLocalStorageAvailable()) ? $window.localStorage[key] : $cookies.get(key);
			return r;
		},
		setObject: function(key, value) {
			var d = new Date(),
				o = JSON.stringify(value);
			if (isLocalStorageAvailable()) {
				$window.localStorage[key] = o;
			} else {
				$cookies.putObject(key, o, {expires: d.setDate(expiry_days)});
			}
		},
		getObject: function(key) {
			var r = (isLocalStorageAvailable()) ? $window.localStorage[key] : $cookies.getObject(key);
			return r ? JSON.parse(r) : false;
		},
		remove: function(key) {
			if (isLocalStorageAvailable()) {
				$window.localStorage.removeItem(key);
			} else {
				$cookies.remove[key];
			}
		}
	}
}]);

function arrayFillMethod() {
	if (!Array.prototype.fill) {
		Object.defineProperty(Array.prototype, 'fill', {
			value: function(value) {
				
				// Steps 1-2.
				if (this == null) {
					throw new TypeError('this is null or not defined');
				}
				
				var O = Object(this);
				
				// Steps 3-5.
				var len = O.length >>> 0;
				
				// Steps 6-7.
				var start = arguments[1];
				var relativeStart = start >> 0;
				
				// Step 8.
				var k = relativeStart < 0 ?
					Math.max(len + relativeStart, 0) :
					Math.min(relativeStart, len);
				
				// Steps 9-10.
				var end = arguments[2];
				var relativeEnd = end === undefined ?
					len : 
					end >> 0;
				
				// Step 11.
				var final = relativeEnd < 0 ?
					Math.max(len + relativeEnd, 0) :
					Math.min(relativeEnd, len);
				
				// Step 12.
				while (k < final) {
					O[k] = value;
					k++;
				}
				
			// Step 13.
			return O;
			}
		});
	}
}

function generateUUID() {
	var r, d;
	d = new Date().getTime();
	if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
		d += performance.now(); //use high-precision timer if available
	}
	r = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (d + Math.random() * 16) % 16 | 0;
		d = Math.floor(d / 16);
		return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
	return r;
};

function getBrowser() {
	var browser, isIE;
	
	isIE = /*@cc_on!@*/false || !!document.documentMode;
	
	if ( (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0 ) {
		browser = "Opera";
	} else if ( typeof InstallTrigger !== 'undefined' ) {
		browser = "Firefox";
	} else if ( /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification)) ) {
		browser = "Safari";
	} else if ( isIE ) {
		browser = "Internet Explorer";
	} else if ( !isIE && !!window.StyleMedia ) {
		browser = "Edge";
	} else if ( !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime) ) {
		browser = "Chrome";
	} else {
		browser = "Unknown browser";
	}
	return browser;
}


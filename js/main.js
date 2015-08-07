'use strict';

var openedFileName;
var bindings = {
	showMaidUtil: false,

	version: "1.1.1",

	msgbox: {
		title: '',
		text: ''
	}
};

function showMsgbox(title, text) {
	bindings.msgbox.title = title;
	bindings.msgbox.text = text;
	$('#message').openModal();
}

function updateMaterialSelect(obj) {
	obj.material_select('update');
	obj.closest('.input-field').children('span.caret').remove();
}

function updateMaterialize() {
	$("input").change();
	$("textarea").change().keydown();
	updateMaterialSelect($('select'));
	setTimeout(function() {
		$('ul.tabs').tabs();
	}, 300);
}

function openOpenDialog(callback, accept) {
	var fileSelector = $('<input type="file">');
	if (accept) fileSelector.attr('accept', accept);
	fileSelector.change(function() {
		var files = fileSelector[0].files;
		if (files.length) {
			callback(files[0]);
		} else {
			callback(null);
		}
	});
	fileSelector.click();
}

function createDataURL(data) {
	var base64;
	if (data instanceof Uint8Array) {
		base64 = data.toBase64();
	} else {
		base64 = btoa(unescape(encodeURIComponent(data)));
	}
	return 'data:application/octet-stream;base64,' + base64;
}

$('#button-upload').click(function() {
	openOpenDialog(function(file) {
		if (file) {
			var reader = new FileReader();
			reader.onload = function() {
				try {
					loadJSON(parseSaveData(reader.result));
				} catch (e) {
					alert(i18n.invalidsave + ' ' + e.message);
				}
				openedFileName = file.name.replace(/\.[^.]+$/, '');
			}
			reader.readAsArrayBuffer(file);
		}
	}, '.save');
});

$('#button-loadjson').click(function() {
	openOpenDialog(function(file) {
		if (file) {
			var reader = new FileReader();
			reader.onload = function() {
				try {
					loadJSON(JSON.parse(reader.result));
				} catch (e) {
					alert(i18n.invalidjson);
				}
				openedFileName = file.name.replace(/\.[^.]+$/, '');
			}
			reader.readAsText(file);
		}
	}, '.json');
});

$('#button-download').click(function() {
	saveAs(new Blob([new Uint8Array(writeSaveData(bindings.save))]), openedFileName + '.save');
});

$('#button-savejson').click(function() {
	saveTextAs(JSON.stringify(bindings.save, null, 2), openedFileName + '.json');
});

$('#button-createurl').click(function() {
	var newWindow = window.open();
	newWindow.document.body.innerHTML = '如果安装了迅雷 请用右键另存为<br/><a download="' + openedFileName + '.save" href="' + createDataURL(writeSaveData(bindings.save)) + '">CM3D2 Save文件格式</a><br/>' + '<a download="' + openedFileName + '.json" href="' + createDataURL(JSON.stringify(bindings.save, null, 2)) + '">JSON文件格式</a>';
});

function loadJSON(model) {
	bindings.save = model;

	// Short path
	bindings.header = model.header;
	bindings.player = model.chrMgr.playerParam;

	// Select first tab
	$('a[href=#profile]').click();

	// Select first maid
	$($('a[maid-guid]')[0]).click();

	$('#saveEditor').show(200);
	updateMaterialize();
}

function limitNum(value, min, max) {
	value = parseInt(value) || 0;
	if (value < min) return min;
	if (value > max) return max;
	return value;
}

rivets.formatters.int32 = {
	read: function(value) {
		return value;
	},
	publish: function(value) {
		return parseInt(value) || 0;
	}
};

rivets.formatters.int64 = {
	read: function(value) {
		if (value)
			return new Long(value[0], value[1]).toString();
		return '';
	},
	publish: function(value) {
		try {
			var long = Long.fromString(value);
		} catch (e) {
			return [0, 0];
		}
		return [long.low_, long.high_];
	}
};

rivets.formatters.rate = {
	read: function(value) {
		return value / 10;
	},
	publish: function(value) {
		value = parseFloat(value) || 0;
		return Math.round(value * 10);
	}
};

rivets.formatters._9999 = {
	read: function(value) {
		return value;
	},
	publish: function(value) {
		return limitNum(value, 0, 9999);
	}
};

rivets.adapters['#'] = {
	observe: function(obj, keypath, callback) {},
	unobserve: function(obj, keypath, callback) {},
	get: function(obj, keypath) {
		keypath = JSON.parse(keypath);
		return obj.indexOf(keypath) !== -1;
	},
	set: function(obj, keypath, value) {
		keypath = JSON.parse(keypath);
		var idx = obj.indexOf(keypath);
		var existing = idx !== -1;
		if (existing !== value) {
			if (value) {
				obj.push(keypath);
			} else {
				obj.splice(idx, 1);
			}
		}
	}
}

rivets.formatters.image = function(base64) {
	return 'data:image/png;base64,' + base64;
}

rivets.formatters.format = function(data, string) {
	return string.replace('$0', data);
};

rivets.formatters.eval = function(data, string) {
	return new Function('$0', 'return ' + string)(data);
};

$(function() {
	var templates = $('script[type="text/template"]');
	for (var i = 0; i < templates.length; i++) {
		var t = $(templates[i]);
		t.before(t.text()).remove();
	}
});

function getMaidByGUID(guid) {
	var maids = bindings.save.chrMgr.stockMaid;
	for (var i = 0; i < maids.length; i++) {
		if (maids[i].param.guid === guid) return maids[i];
	}
	return null;
}

function selectMaid(guid) {
	bindings.maid = getMaidByGUID(guid);
	updateMaterialize();
}

function editBody(guid) {
	$('#bodyEditor_selector').val('');
	bindings.bodyEditor.property = null;

	$('#bodyEditor').openModal();
};

function editFeature(guid) {
	$('#featureEditor').openModal();
};

function editPropensity(guid) {
	$('#propensityEditor').openModal();
};

bindings.bodyEditor = {
	property: null
};

var bodyEditor = {
	changeProperty: function(value) {
		bindings.bodyEditor.property = bindings.maid.props[value];
		updateMaterialize();
	}
};

var util = {
	unlockBodyLimits: function() {
		var allMaids = bindings.save.chrMgr.stockMaid;
		for (var i = 0; i < allMaids.length; i++) {
			var maid = allMaids[i];
			maid.props.DouPer.min = 0;
			maid.props.DouPer.max = 100;
			maid.props.sintyou.min = 0;
			maid.props.sintyou.max = 100;
		}
		Materialize.toast(i18n.util.unlockBodyLimitsFinished, 4000);
	},
	allItems: function() {
		var list = bindings.player.haveItemList;
		var keys = Object.getOwnPropertyNames(list);
		for (var i = 0; i < keys.length; i++) {
			if (list.propertyIsEnumerable(keys[i])) {
				list[keys[i]] = true;
			}
		}
		Materialize.toast(i18n.util.allItemsFinished, 4000);
	},
	allTrophies: function() {
		bindings.player.haveTrophyList = [
			1, 2, 3, 4, 5, 6, 7, 8, 9,
			10, 20, 30, 40, 50, 60, 70, 80, 90,
			100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
			200, 210, 220, 230, 240, 250, 260, 270, 280, 290,
			300, 310, 320, 330, 340, 350, 360, 370, 380, 390,
			400, 410, 420, 430, 440, 450, 460, 470, 480, 490
		];
		Materialize.toast(i18n.util.allTrophiesFinished, 4000);
	},
	maidClassMax: function() {
		var data = bindings.maid.param.maidClassData;
		var totalExp = [320, 395, 395, 395, 500, 500, 500];
		for (var i = 0; i < 7; i++) {
			data[i].have = true;
			data[i].exp.currentExp = 0;
			data[i].exp.level = 10;
			data[i].exp.nextExp = 0;
			data[i].exp.totalExp = totalExp[i];
		}
		Materialize.toast(i18n.util.maidClassMaxFinished, 4000);
	},
	yotogiClassMax: function() {
		var data = bindings.maid.param.yotogiClassData;
		for (var i = 0; i < 7; i++) {
			data[i].have = true;
			data[i].exp.currentExp = 0;
			data[i].exp.level = 10;
			data[i].exp.nextExp = 0;
			data[i].exp.totalExp = 4530;
		}
		Materialize.toast(i18n.util.yotogiClassMaxFinished, 4000);
	},
	allSkills: function() {
		var data = bindings.maid.param.skillData;
		var skillIndex = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 345, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770, 780, 790, 800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 900, 910, 920, 930, 940, 950, 960, 970, 980, 990, 1000];
		for (var i = 0; i < skillIndex.length; i++) {
			var idx = skillIndex[i];
			if (data[idx]) {
				data[idx].exp.currentExp = 0;
				data[idx].exp.level = 3;
				data[idx].exp.nextExp = 0;
				data[idx].exp.totalExp = 300;
			} else {
				data[idx] = {
					exp: {
						currentExp: 0,
						level: 3,
						nextExp: 0,
						totalExp: 300
					},
					id: idx,
					playCount: 0
				};
			}
		}
		Materialize.toast(i18n.util.allSkillsFinished, 4000);
	},
	allWork: function() {
		var data = bindings.maid.param.workData;
		var workIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 101, 1001, 1002];
		for (var i = 0; i < workIndex.length; i++) {
			var idx = workIndex[i];
			if (data[idx]) {
				data[idx].level = 3;
				data[idx].playCount = 20;
			} else {
				data[idx] = {
					id: idx,
					level: 3,
					playCount: 20
				};
			}
		}
		Materialize.toast(i18n.util.allWorkFinished, 4000);
	}
};

$(document).ready(function() {
	rivets.bind($('body'), i18n, {
		prefix: 'i18n',
		templateDelimiters: ['[', ']'],
	});
	rivets.bind($('body'), bindings, {
		prefix: 'bind'
	});
	$('select').material_select();
});


function forEachKeys(obj, callback) {
	var keys = Object.getOwnPropertyNames(obj);
	for (var i = 0; i < keys.length; i++) {
		if (obj.propertyIsEnumerable(keys[i])) {
			callback(obj, keys[i], obj[keys[i]]);
		}
	}
}

function checkVersion() {
	if (localStorage.version !== bindings.version) {
		localStorage.version = bindings.version;
		(function() {
			var title = i18n.ui.updateNotice.replace('${version}', bindings.version);
			var body = '';
			forEachKeys(i18n.updateHistory, function(obj, key, value) {
				body += key + '<br/>' + value.map(function(a) {
					return '&emsp;&emsp;' + a + '<br/>';
				});
			});
			showMsgbox(
				i18n.ui.updateNotice.replace('${version}', bindings.version),
				i18n.ui.updateHistoryTemplate.replace('${body}', body)
			);
		})();
	}
}

function include(file, callback) {
	var script = document.createElement('script');
	script.src = file;
	script.onload = function() {
		callback && callback();
	};
	document.head.appendChild(script);
	document.head.removeChild(script);
}

function switchLocale(locale, callback) {
	var oldi18n = i18n;
	include('i18n/' + locale + '.js', function() {
		var newi18n = i18n;
		i18n = oldi18n;
		$.extend(oldi18n, newi18n);
		callback && callback();
	});
}

var locale = localStorage.locale || navigator.language || navigator.browserLanguage;
if (locale.indexOf("zh") !== -1) {
	switchLocale('zh', checkVersion);
} else {
	checkVersion();
}
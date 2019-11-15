// todo:
// 	allow arbitrary ID input (find how save file ID is determined - doesn't look like hash of Steam ID)

var firstFileID = null;
var downloadFile = null;
// Program state:
// 0 = awaiting file one (user's own fresh save file)
// 1 = awaiting file two (file which user would like to use, but which has incorrect ID)
// 2 = offering download of modified file to user
var state = 0;
reflectNewProgramState();

// register listener
const inputElement = document.getElementById("file-input");
inputElement.addEventListener("change", handleFile, false);
function handleFile() {
	// get file
	const fileList = this.files;
	const file = fileList[0];
	// validate file size
	if (file.size != 1047200) {
		alert('Unrecognized save file format.\nThis is an error.\nSorry about that.\nResetting...');
		return startOver();
	}
	// set up callback to handle file depending on program state
	switch (state) {
		case 0:
			// first file input
			var reader = new FileReader();
			// get user ID from file
			reader.onload = function () {
				var result = reader.result;
				var idSlice = result.slice(result.byteLength-8);
				idSlice = idSlice.slice(0,4);
				// firstFileIDInt = new Int32Array(idSlice);
				firstFileID = idSlice;
				// advance program state
				state = 1;
				reflectNewProgramState();
			}
			// request file to be read (now that the callback is set up to handle it)
			reader.readAsArrayBuffer(file);
			break;
		case 1:
			// second file input
			var reader = new FileReader();
			// replace ID with retrieved ID from first file
			reader.onload = function () {
				var thisSaveFile = reader.result;
				downloadFile = replaceSaveFileID(thisSaveFile, firstFileID);
				// advance program state
				state = 2;
				reflectNewProgramState();
			}
			// request file to be read (now that the callback is set up to handle it)
			reader.readAsArrayBuffer(file);
			break;
		case 2:
			alert('You shouldn\'t have been able to click that...\nThis is an error.\nSorry about that.\nResetting...');
			return startOver();
	}
}

// returns saveFile with newID spliced in over the old one
function replaceSaveFileID(saveFile, newID) {
	// get data fragment leading up to user ID
	var fragmentA = saveFile.slice(0, saveFile.byteLength-8)
	// get data fragment for user ID
	var fragmentB = firstFileID;
	if (fragmentB === null) {
		alert('ID not detected when it should be...\nThis is an error.\nSorry about that.\nResetting...');
		return startOver();
	}
	// get data fragment following user ID (is it ever not 00 00 00 00?)
	var fragmentC = saveFile.slice(saveFile.byteLength-4)

	// combine all fragments into final result and return it
	var saveFileWithIDReplaced = _appendBuffer(_appendBuffer(fragmentA,fragmentB),fragmentC);
	return saveFileWithIDReplaced;
}

// restart program
function startOver() {
	state = 0;
	reflectNewProgramState();
}

// update UI to reflect new program state
function reflectNewProgramState() {
	switch (state) {
		case 0:
			// reset to initial state
			var instruction = 'Upload a save file with the <b>USER ID</b> you would like to use.';
			instruction += '<br>';
			instruction += '(A new, fresh, empty one will do)';
			document.getElementById("instruction-text").innerHTML = instruction;
			document.getElementById("file-input").style.display = 'block';
			document.getElementById("download-button").style.display = 'none';
			break;
		case 1:
			// awaiting second file
			var instruction = 'Upload a save file with the <b>GAME PROGRESS</b> you would like to use.';
			document.getElementById("instruction-text").innerHTML = instruction;
			document.getElementById("file-input").style.display = 'block';
			document.getElementById("download-button").style.display = 'none';
			break;
		case 2:
			// offering altered file for download
			var instruction = 'Download and place this file into your game\'s save location.'
			document.getElementById("instruction-text").innerHTML = instruction;
			document.getElementById("file-input").style.display = 'none';
			document.getElementById("download-button").style.display = 'block';
			break;
	}
}

// download produced file to user's PC
function downloadResult() {
	if (state == 2) {
		if (downloadFile === null) {
			alert('Result not detected when it should be...\nThis is an error.\nSorry about that.\nResetting...');
			return startOver();
		}
		saveByteArray('savegame00.sav', downloadFile);
	}
	else {
		alert('You shouldn\'t have been able to click that...\nThis is an error.\nSorry about that.\nResetting...');
		return startOver();
	}
}

// https://gist.github.com/72lions/4528834
/**
 * Creates a new Uint8Array based on two different ArrayBuffers
 *
 * @private
 * @param {ArrayBuffers} buffer1 The first buffer.
 * @param {ArrayBuffers} buffer2 The second buffer.
 * @return {ArrayBuffers} The new ArrayBuffer created out of the two.
 */
function _appendBuffer(buffer1, buffer2) {
	var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
	tmp.set(new Uint8Array(buffer1), 0);
	tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
	return tmp.buffer;
};

// https://stackoverflow.com/questions/35038884/download-file-from-bytes-in-javascript
// saves byte array to file
function saveByteArray(reportName, byte) {
	var blob = new Blob([byte]);
	var link = document.createElement('a');
	link.href = window.URL.createObjectURL(blob);
	var fileName = reportName;
	link.download = fileName;
	link.click();
};
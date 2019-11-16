'use strict'
// todo:
// 	allow arbitrary ID input (need to decipher second value used in this program to do so)
// 	remove program statefulness

// steam user's ID3, or "account number"
// https://developer.valvesoftware.com/wiki/SteamID
// https://steamid.io/
// (watch the endian-ness)
var firstFileID = null;
// what this value is is unknown, and it's why user can't just enter their ID to tailor a file...
var firstFileIDLikeObject = null;

// This is how the program works.  User uploads file with their IDs, we save them, user
//   uploads file they wish to use, and we replace file 2's two 4-byte "id"s in both locations
//   which require it, allowing user to use save file 2 given the credentials which created
//   save file 1.

// bytes in final-download user-tailored save file
var downloadFile = null;
// Program state:
// (we're stateful because we're complex & fragile enough atm WITHOUT closure scopes)
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

				// retrieve user's id
				firstFileID = result.slice(7744, 7748); // 4 bytes @ 0x1e40
				// update path shown in UI given this ID
				var userID =  new Int32Array(firstFileID);
				document.getElementById("path-id").innerText = userID;


				// retrieve user's... other... id?  idk what it is, but we need it.
				firstFileIDLikeObject = result.slice(result.byteLength-8, result.byteLength-4);
				// console.log(new Int32Array(firstFileIDLikeObject));

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
				downloadFile = replaceSaveFileIDs(thisSaveFile);
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
function replaceSaveFileIDs(saveFile) {
	// ensure fragments have already been retrieved
	if ((firstFileID === null) || (firstFileIDLikeObject === null)) {
		alert('ID not detected when it should be...\nThis is an error.\nSorry about that.\nResetting...');
		return startOver();
	}

	// ~~~ first splice (of user's ID) ~~~
	// fragment leading up to ID location
	var fragmentA = saveFile.slice(0, 7744)
	// user ID
	var fragmentB = firstFileID;
	// rest of file following user ID
	var fragmentC = saveFile.slice(7748)
	// combine fragments into result
	var modifiedSaveFile = _appendBuffer(_appendBuffer(fragmentA,fragmentB),fragmentC);

	// ~~~ second splice (of user's other unique identifier near EOF) ~~~
	// fragment leading up to identifier location
	fragmentA = modifiedSaveFile.slice(0, modifiedSaveFile.byteLength-8)
	// identifier
	fragmentB = firstFileIDLikeObject;
	// rest of file following user identifier (is it ever not 00 00 00 00?)
	fragmentC = modifiedSaveFile.slice(modifiedSaveFile.byteLength-4)
	// combine fragments into result
	modifiedSaveFile = _appendBuffer(_appendBuffer(fragmentA,fragmentB),fragmentC);

	return modifiedSaveFile;
}

// restart program
function startOver() {
	firstFileID = null;
	firstFileIDLikeObject = null;
	downloadFile = null;
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

// register listener for more info button
document.getElementById("more-info-button").addEventListener("click", function () {
	var msg = "";
	msg += "You may need to disable the Steam cloud if you encounter issues.";
	msg += "\n";
	msg += "\n";
	msg += "The game might tell you that there's no save file.";
	msg += "  Just agree, let it make a new one, then replace that new one with the one this program gave you (again).";
	msg += "\n";
	msg += "\n";
	msg += "Never let the game try to load your last copy of any file.";
	msg += "  The game will permanently delete savegame00.sav if anything goes wrong";
	msg += " - be sure to always keep backups & we'll be okay.";
	msg += "\n";
	msg += "\n";
	msg += "If you see anything that needs fixing or you have an idea for how to improve this tool,";
	msg += " collaboration is welcome!  There's a link to the source in the corner.";
	alert(msg);
});
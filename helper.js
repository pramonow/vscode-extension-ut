const vscode = require('vscode');

function GetArgString(varList) {

	var stringToReturn = ""

	for (var i in varList) {
		stringToReturn = stringToReturn + "\t\t" + varList[i].name + " " + varList[i].type  + '\n'
	}

	return stringToReturn
}

function GetWantString(argsList) {

	var stringToReturn = ""

	var resCount = 0
	var errCount = 0

	for (var i in argsList) {

		if (argsList[i] == "error") {
			if (errCount > 0) {
				stringToReturn = stringToReturn + "\t\t" + "wantErr" + errCount + " bool" + '\n'
			} else {
				stringToReturn = stringToReturn + "\t\t" + "wantErr" + " bool" + '\n'
			}
		} else {
			if (resCount > 0) {
				stringToReturn = stringToReturn + "\t\t" + "want" + resCount + " " + argsList[i] + '\n'
			} else {
				stringToReturn = stringToReturn + "\t\t" + "want" + " " + argsList[i] + '\n'
			}
		}
	}

	return stringToReturn
}

function ConstructMethodCalling(extension, returnList, funcName, argVarList) {
	var gotCount = 0
	var errCount = 0

	var stringToReturn = ""

	var assertStatemnt = ""

	for (var i in returnList) {
		let comma = ""

		if (i == "0"){
			comma = ""
		} else {
			comma = " ,"
		}

		if (returnList[i] == "error") {
			if (errCount > 0) {
				stringToReturn = stringToReturn + comma + "err" + errCount
				assertStatemnt = assertStatemnt + 
				`		
		if (err${errCount} != nil) != tt.wantErr${errCount} {
		t.Errorf("${extension}.${funcName}() error = %v, wantErr %v", err${errCount}, tt.wantErr${errCount})
		return
		}`
			} else {
				stringToReturn = stringToReturn + comma + "err"
				assertStatemnt = assertStatemnt +`		
				if (err != nil) != tt.wantErr {
				t.Errorf("${extension}.${funcName}() error = %v, wantErr %v", err, tt.wantErr)
				return
				}`
			}
		} else {
			if (gotCount > 0) {
				stringToReturn = stringToReturn + comma + "got" + gotCount
				assertStatemnt = assertStatemnt + 
				`
		assert.Equal(t,got${gotCount},tt.want${gotCount})
				`
			} else {
				stringToReturn = stringToReturn + comma + "got"
				assertStatemnt = assertStatemnt + 
				`
		assert.Equal(t,got,tt.want)
				`
			}
		}
	}

	stringToReturn = stringToReturn + ":=" + extension + '.' + funcName +"("
	for (var i in argVarList) {
		let comma = ""
		if (i == "0"){
			comma = ""
		} else {
			comma = " ,"
		} 

		stringToReturn = stringToReturn + comma + "tt.args." + argVarList[i].name
	}
	console.log(stringToReturn)

	return stringToReturn + ")" + "\n" + assertStatemnt
}



//function to get package name on top
//i.e: package model
function GetPackageNaming(){
	const textEditor = vscode.window.activeTextEditor

	var i;
	for(i =0;i<textEditor.document.lineCount - 1;i++){
		var line = textEditor.document.lineAt(i)
		var textRange = new vscode.Range(line.range.start, line.range.end);
		var wholeText = textEditor.document.getText(textRange);

		if(wholeText.includes("package ")) {
			return wholeText
		}
	}

	return ""
}

module.exports = {
    GetArgString,
    GetWantString,
	ConstructMethodCalling,
	GetPackageNaming
}
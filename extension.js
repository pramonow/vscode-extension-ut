// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs')
const fsPromises = fs.promises;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	//filename
	var filename = vscode.window.activeTextEditor.document.fileName

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('go.unittestgomock', function () {
		// The code you place here will be executed every time your command is executed

		const editor = vscode.window.activeTextEditor;
		let cursorPosition = editor.selection.start;
		let wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
		let functionName = editor.document.getText(wordRange);

		var wordLine = editor.document.lineAt(cursorPosition);
		var textRange = new vscode.Range(wordLine.range.start, wordLine.range.end);
		var wholeText = editor.document.getText(textRange);
		var beforeRegex = /\((.*?)\)/

		//getting caller class
		var patternBeforeFunc = new RegExp(`(.+) ${functionName}`);
		var resultBefore = wholeText.match(patternBeforeFunc)
		var extensionVar = resultBefore[1].match(beforeRegex)

		var extentionParam = ""
		var pointerConstParam = ""

		if (extensionVar != null) {
			var extensionInsides = extensionVar[1].split(" ")

			if (extensionInsides[1].indexOf('*') > -1) {
				pointerConstParam = "&"
			}

			extentionParam = extensionInsides[1].replace(/[*\s]/g, '')
		}
		console.log(extentionParam)
		
		//getting argument list
		var pattern = new RegExp(`[\n\r]*${functionName}*([^\n\r]*)`);
		var result = wholeText.match(pattern)
		var varList = result[1].match(beforeRegex)

		var argsList = varList[1].split(",")
		for (var i in argsList) {
			argsList[i] = argsList[i].trim()
		}
		console.log(argsList)

		//getting returning result
		var afterVar = result[1].substring(result[1].indexOf(")"));

		//cleaning
		afterVar = afterVar.replace(/[(){}\s]/g, '')

		var returnList = afterVar.split(",")
		console.log(returnList)

		var generatedTest = `
func Test${extentionParam}_${functionName} (t *testing.T) {
	//ctrl := gomock.NewController(t)
	//defer ctrl.Finish

	type args struct {
${GetArgString(argsList)}	}
	//type mockedResult struct {
	//	ret1 string
	//  err1 error	
	//}
	type expectedResult struct {
${GetResultString(returnList)}	}

	//type mockGen struct {
	//	db MockDB
	//	expect func(db *MockDB, arg0, arg1, ret1, err1 interface{})
	//}

	tests:= []struct {
		name string
		args args
${GetWantString(returnList)}
		//mock mockedResult
		//model mockGen
	} {
		{
			name: "sample template",
			//model: mockgen{
			//	db:NewMockDB(ctrl),
			//expect: func(db *MockDB, arg1, arg2, ret1, err1 interface{}) {
			//	db.EXPECT().TestFunction(arg1, arg2).Return(ret1, err1)
			//},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			//uc := NewUseCase(tt.model.db)
			//tt.model.expect(tt.model.db, arg1, arg2, ret1, err1)


			${extentionParam}Caller := ${pointerConstParam}${extentionParam}{}
			${ConstructMethodCalling(extentionParam+"Caller", returnList, functionName, argsList)}

				
		})
	}
}`

		var currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName
		var fileName = currentlyOpenTabfilePath.replace('.go','');
		fileName = fileName + "_test.go"

		writeToFile(fileName,generatedTest, `Test${extentionParam}_${functionName}`)

		// Display a message box to the user
		//vscode.window.showInformationMessage('Hello World JS from helloworld!');
	});

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

function GetArgString(argsList) {

	var stringToReturn = ""

	for (var i in argsList) {
		stringToReturn = stringToReturn + "\t\t" + argsList[i] + '\n'
	}

	return stringToReturn
}

function GetResultString(argsList) {

	var stringToReturn = ""

	var resCount = 0
	var errCount = 0

	for (var i in argsList) {

		if (argsList[i] == "error") {
			if (errCount > 0) {
				stringToReturn = stringToReturn + "\t\t" + "error" + errCount + " " + argsList[i] + '\n'
			} else {
				stringToReturn = stringToReturn + "\t\t" + "error" + " " + argsList[i] + '\n'
			}
		} else {
			if (resCount > 0) {
				stringToReturn = stringToReturn + "\t\t" + "res" + resCount + " " + argsList[i] + '\n'
			} else {
				stringToReturn = stringToReturn + "\t\t" + "res" + " " + argsList[i] + '\n'
			}
		}
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

function ConstructMethodCalling(extension, returnList, funcName, argsList){
	var gotCount = 0
	var errCount = 0

	var stringToReturn = ""

	var assertStatemnt = ""
	var aa = `			if (err != nil) != tt.wantErr {
		t.Errorf("providerCategoryMappingUseCase.GetProviderCategoryMapping() error = %v, wantErr %v", err, tt.wantErr)
		return
	}
	if !reflect.DeepEqual(got, tt.want.result) {
		t.Errorf("providerCategoryMappingUseCase.GetProviderCategoryMapping() = %v, want %v", got, tt.want.result)
	}`

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
	for (var i in argsList) {
		let comma = ""
		if (i == "0"){
			comma = ""
		} else {
			comma = " ,"
		} 

		var paramList = argsList[i].split(" ")
		stringToReturn = stringToReturn + comma + "tt.args." + paramList[0]
	}

	return stringToReturn + ")" + "\n" + assertStatemnt
}

function writeToFile(filename, message, testFunctionName) {
	fs.open(filename,'r',function(err, fd){
	  if (err) {
		fs.writeFile(filename, '', function(err) {
			if(err) {
				console.log(err);
			}

			message = GetPackageNaming() + '\n\n' + message

			vscode.workspace.openTextDocument(filename).then(document => {
				const edit = new vscode.WorkspaceEdit()
				edit.insert(filename, new vscode.Position(0, 0), message);
				return vscode.workspace.applyEdit(edit).then(success => {
					if (success) {
						document.save()
						vscode.window.showInformationMessage(`${testFunctionName} created`)
					} else {
						vscode.window.showInformationMessage('Error!');
					}
				});
			});

			//fs.appendFile(filename, message, function (err) {
			//	if (err) throw err;
			//	console.log('Saved!');
			//	vscode.window.showInformationMessage(`${testFunctionName} created`);
			//  });
		});
	  } else {
		console.log("The file exists!")

		fs.readFile(filename, function (err, data) {
			if (err) throw err;
			if(data.indexOf(testFunctionName) >= 0){
			 console.log("ALREADY EXISTS")
			 vscode.window.showInformationMessage("Unit test not created")
			 return
			}

			vscode.workspace.openTextDocument(filename).then(document => {
				const edit = new vscode.WorkspaceEdit()
				edit.insert(filename, new vscode.Position(document.lineCount , 0), message);
				return vscode.workspace.applyEdit(edit).then(success => {
					if (success) {
						document.save()
						vscode.window.showInformationMessage(`${testFunctionName} created`)
					} else {
						vscode.window.showInformationMessage('Error!');
					}
				});
			});

			//fs.appendFile(filename, message, function (err) {
			//	if (err) throw err;
			//	console.log('Saved!');
			//	vscode.window.showInformationMessage(`${testFunctionName} created`);
			//  });
		  });
	  }
	});
  }

  function GetPackageNaming(){
	const textEditor = vscode.window.activeTextEditor

	var i;
	for(i =0;i<textEditor.document.lineCount - 1;i++){
		var line = textEditor.document.lineAt(i)
		var textRange = new vscode.Range(line.range.start, line.range.end);
		var wholeText = textEditor.document.getText(textRange);

		if(wholeText.includes("package ")) {
			console.log(wholeText)
			return wholeText
		}
	}

	return ""
}
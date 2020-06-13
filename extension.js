// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs')
const helper = require("./helper.js");

function ConstructVariable(name, type) {
	
	var variablePair = {
		name:name,
		type:type
	}

	return variablePair
}


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {	
	let disposable = vscode.commands.registerCommand('go.unittestgomock', function () {
		// The code you place here will be executed every time your command is executed

		//initialize
		const editor = vscode.window.activeTextEditor
		let cursorPosition = editor.selection.start

		//getting function block
		let wordRange = editor.document.getWordRangeAtPosition(cursorPosition)
		let functionName = editor.document.getText(wordRange)

		var wordLine = editor.document.lineAt(cursorPosition)
		var textRange = new vscode.Range(wordLine.range.start, wordLine.range.end)
		var wholeText = editor.document.getText(textRange)

		var lineCount = cursorPosition.line

		//for multiline declaration
		while(!wholeText.includes('{')) {
			console.log(lineCount)
			if (lineCount > editor.document.lineCount) {
				vscode.window.showInformationMessage("Invalid method")
				return
			}

			lineCount++
			var wordLine = editor.document.lineAt(lineCount)
			var textRange = new vscode.Range(wordLine.range.start, wordLine.range.end)
			wholeText += editor.document.getText(textRange)
		}

		wholeText = wholeText.substring(0, wholeText.indexOf("{") + 1)
		console.log(wholeText)

		var beforeRegex = /\((.*?)\)/

		//getting caller class
		var patternBeforeFunc = new RegExp(`(.+) ${functionName}`);
		var resultBefore = wholeText.match(patternBeforeFunc)
		var extensionVar = resultBefore[1].match(beforeRegex)

		var extentionParam = ""
		var pointerConstParam = ""

		//extension or caller param func(a model) funcName()
		//will get `model`
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

		var argsListString = varList[1].trim().split(",")

		var tempType = ''
		var argVarList = []

		//iteration for variable
		//from behind for variable like func asda (n,i int)
		for (var i = argsListString.length - 1; i >= 0; --i) {
			argsListString[i] = argsListString[i].trim()
			
			var nameAndType = argsListString[i].split(" ")

			if (nameAndType.length < 2) {
				argVarList.push(ConstructVariable(nameAndType[0], tempType))
			} else {
				argVarList.push(ConstructVariable(nameAndType[0], nameAndType[1]))
				tempType = nameAndType[1]
			}
		}

		//getting returning result
		var afterVar = result[1].substring(result[1].indexOf(")"));

		//cleaning
		afterVar = afterVar.replace(/[(){}\s]/g, '')

		var returnList = afterVar.split(",")

		var generatedTest = `
func Test_${extentionParam}_${functionName} (t *testing.T) {
	//ctrl := gomock.NewController(t)
	//defer ctrl.Finish()

	type args struct {
${helper.GetArgString(argVarList)}	}

	//type mockedResult struct {
	//	ret1 string
	//  err1 error	
	//}

	//type mockGen struct {
	//	db MockDB
	//	expect func(db *MockDB, arg0, arg1, ret1, err1 interface{})
	//}

	tests:= []struct {
		name string
		args args
${helper.GetWantString(returnList)}
		//mock mockedResult
		//model mockGen
	} {
		{
			name: "sample template",
			//model: mockGen{
			//	db:NewMockDB(ctrl),
			//  expect: func(db *MockDB, arg1, arg2, ret1, err1 interface{}) {
			//		db.EXPECT().TestFunction(arg1, arg2).Return(ret1, err1)
			//	},
			//},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			//uc := NewUseCase(tt.model.db)
			//tt.model.expect(tt.model.db, arg1, arg2, ret1, err1)

			${extentionParam}Caller := ${pointerConstParam}${extentionParam}{}
			${helper.ConstructMethodCalling(extentionParam+"Caller", returnList, functionName, argVarList)}
		})
	}
}`

		var currentlyOpenTabfilePath = vscode.window.activeTextEditor.document.fileName
		var fileName = currentlyOpenTabfilePath.replace('.go','');
		fileName = fileName + "_test.go"

		console.log("here")
		WriteToFile(fileName,generatedTest, `Test_${extentionParam}_${functionName}`)
	});

	context.subscriptions.push(disposable);
}

function WriteToFile(filename, message, testFunctionName) {
	fs.open(filename,'r',function(err, fd){
	  if (err) {
		fs.writeFile(filename, '', function(err) {
			if(err) {
				console.log(err);
			}

			message = helper.GetPackageNaming() + '\n\n' + message

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
		});
	  } else {
		console.log("The file exists!")

		fs.readFile(filename, function (err, data) {
			if (err) throw err;
			if(data.indexOf(testFunctionName) >= 0){
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
		  });
	  }
	});
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}


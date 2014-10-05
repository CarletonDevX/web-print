chrome.browserAction.onClicked.addListener(function(){
	//option A: Open a new tab
	chrome.tabs.create({url: "main.html"})
	//option B: Open a new window
	//chrome.windows.create({url: "main.html", type: "popup"})
});
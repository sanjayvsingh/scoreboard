// declare global variables
var curHalf;
var curInning;
var curOuts;
var lastTimeout;  // used for tracking the last timeout request so we can clear it

function getMaxInning() {
	var maxInning = 9;

	// iterate through all v# cells and get the highest number
	const cells = document.querySelectorAll('TD');
	cells.forEach( function(c) {
		if ( c.id.match(/v\d+/) ) {
			var inn = Number( c.id.substring(1) );
			if ( maxInning < inn ) { maxInning = inn; }
		}
	})
	return maxInning;
}

function chgInning(id) {
	curHalf = id.substring(0,1);
	curInning = Number(id.substring(1));	

	// clear background on all cells
	const cells = document.querySelectorAll('TD');
	cells.forEach( function(c) {
		// for each table cell, copy its value into a form field with the same name
		if ( c.id.match(/[vh]\d+/) ) {
			c.className = "val";
			if ( 
				( curInning > Number(c.id.substring(1)) )
				|| 
				( curInning == Number(c.id.substring(1)) && c.id.substring(0,1) == "v" && curHalf == "h" ) 
			) {
				// add 0 runs to all previous innings
				c.innerHTML = Number(c.innerHTML);
			}
		}
	})

	// reset out counter
	curOuts = 0;
	updateOutCounter(outs);

	var maxInning = getMaxInning();
	maxInning = 9; // until you figure out how to do extra innings, keep looping back on the 9th
	if ( curInning > maxInning ) {
		curInning = maxInning;
		id = curHalf + curInning;
	}

	// highlight the selected cell			
	document.getElementById(id).className = "selectedCell";
}

function updateOutCounter(outs) {
	var strOuts = "";
	for (i = 0; i < 3; i++) {
		if ( i < curOuts ) {
			strOuts = strOuts + "&FilledSmallSquare;"
		} else {
			strOuts = strOuts + "&EmptySmallSquare;"
		}
	}
	document.getElementById("outs").innerHTML = strOuts;
}

function chgOuts(i) {
	curOuts = Number(curOuts) + i;
	if ( curOuts >= 3 ) {
		// add 0 runs before moving (s=score)
		s = document.getElementById(curHalf + curInning);
		s.innerHTML = Number(s.innerHTML);
		
		if ( curHalf == "v" ) {
			// flip to bottom of inning
			curHalf = "h";
		} else {
			// flip to top of next inning
			curHalf = "v";
			curInning = curInning + 1;
		}
		curOuts = 0;
		chgInning(curHalf + curInning);
	} else if ( curOuts < 0 ) {
		curOuts = 0;
	}
	
	updateOutCounter(curOuts);
	updateScoreboardForm();
}

function updateLinescores() {
	var maxInning = getMaxInning();

	// recalc total runs and set line score
	// build line strings
	var vLine = "";
	var vRuns = 0;
	for (i = 1; i <= maxInning; i++) {
		c = document.getElementById("v"+i);
		if ( c.innerHTML != "" ) {
			vLine = vLine + "|" + Number(c.innerHTML);
			vRuns = vRuns + Number(c.innerHTML);
		} 
	}
	document.getElementById("scoreboard").elements["vLine"].value = vLine.substr(1);  // set the entire built string except the first char (pipe)
	document.getElementById("vRuns").innerHTML = vRuns;
	
	var hLine = "";
	var hRuns = 0;
	for (i = 1; i <= maxInning; i++) {
		c = document.getElementById("h"+i);
		if ( c.innerHTML != "" ) {
			hLine = hLine + "|" + Number(c.innerHTML);
			hRuns = hRuns + Number(c.innerHTML);
		} 
	}
	document.getElementById("scoreboard").elements["hLine"].value = hLine.substr(1);  // set the entire built string except the first char (pipe)
	document.getElementById("vRuns").innerHTML = vRuns;
}

function chgRuns(i) {
	var c = document.getElementById(curHalf + curInning);
	var curRuns = Number(c.innerHTML) + i;
	if ( curRuns < 0 ) { curRuns = 0; }
	c.innerHTML = curRuns;
	
	updateScoreboardForm();
}

function chgHits(i) {
	c = document.getElementById(curHalf + "Hits");
	var curHits = Number(c.innerHTML) + i;
	if ( curHits < 0 ) { curHits = 0; }
	c.innerHTML = curHits;
	updateScoreboardForm();
}

function chgErrors(i) {
	var oppTeam = "h";
	if ( curHalf == "h" ) { oppTeam = "v"; }
	c = document.getElementById(oppTeam + "Errors");
	var curErrors = Number(c.innerHTML) + i;
	if ( curErrors < 0 ) { curErrors = 0; }
	c.innerHTML = curErrors;
	updateScoreboardForm();
}

function chgKs(i) {
	var oppTeam = "h";
	if ( curHalf == "h" ) { oppTeam = "v"; }
	c = document.getElementById(oppTeam + "Ks");
	var curKs = Number(c.innerHTML) + i;
	if ( curKs < 0 ) { curKs = 0; }
	c.innerHTML = curKs;
	updateScoreboardForm();
}

function submitScoreboard() {
	// if there was a previous timeout set, then clear it to restart the timer
	if ( lastTimeout != null ) { 
		clearTimeout(lastTimeout);
	}
	// submit the scoreboard after 2 seconds
	lastTimeout = setTimeout(function() { 
			document.getElementById("scoreboard").submit();
		}, 2000);
}

function updateScoreboardForm() {
	updateLinescores();
	
	var f = document.getElementById("scoreboard");
	const cells = document.querySelectorAll('TD');
	cells.forEach( function(c) {
		// for each table cell, copy its value into a form field with the same name
		if ( f.elements[c.id] != null ) {
			f.elements[c.id].value = c.innerHTML;
		}
	})
	f.elements["curHalf"].value = curHalf;
	f.elements["curInning"].value = curInning;
	f.elements["curOuts"].value = curOuts;

	submitScoreboard();
}

window.onload=function() {
	// set global variables
	var f = document.getElementById("scoreboard");
	if ( f.elements["curHalf"].value == null ) {
		curHalf = "v";
	} else {
		curHalf = f.elements["curHalf"].value;
	}
	if ( f.elements["curInning"].value == null ) {
		curInning = 1;
	} else {
		curInning = f.elements["curInning"].value;
	}
	chgInning(curHalf + curInning);
	//document.getElementById(curHalf + curInning).className = "selectedCell";

	if ( f.elements["curOuts"].value == null ) {
		curOuts = 0;
	} else {
		curOuts = f.elements["curOuts"].value;
	}
	updateOutCounter(curOuts);
};

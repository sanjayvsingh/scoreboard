// Game state — single source of truth, synced to server
var state = {};
var gameCode    = null;
var localVersion = 0;
var pollTimer   = null;
var pushTimer   = null;

// Gameplay cursor — local UI state, included in state object when pushed
var curHalf;
var curInning;
var curOuts;

// ---- API ----

function apiNew(vName, hName, callback) {
    fetch('api.php?action=new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vName: vName, hName: hName })
    })
    .then(function(r) { return r.json(); })
    .then(callback)
    .catch(function(e) { showError('createError', 'Could not reach server. Try again.'); });
}

function apiGet(code, version, callback) {
    fetch('api.php?action=get&code=' + code + '&version=' + version)
    .then(function(r) { return r.json(); })
    .then(callback)
    .catch(function() {}); // silent — next poll will retry
}

function apiUpdate(callback) {
    fetch('api.php?action=update&code=' + gameCode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.state) { localVersion = data.state.version; }
        if (callback) { callback(data); }
    })
    .catch(function() {});
}

// ---- Views ----

function showLanding() {
    document.getElementById('landingView').style.display   = 'block';
    document.getElementById('scoreboardView').style.display = 'none';
    stopPolling();
}

function showScoreboard() {
    document.getElementById('landingView').style.display   = 'none';
    document.getElementById('scoreboardView').style.display = 'block';
}

function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) { return; }
    el.textContent = msg;
    el.style.display = 'block';
}

function clearErrors() {
    ['createError', 'joinError'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
}

// ---- Game lifecycle ----

function createGame() {
    clearErrors();
    var vName = document.getElementById('vNameInput').value.trim() || 'Visitor';
    var hName = document.getElementById('hNameInput').value.trim() || 'Home';
    apiNew(vName, hName, function(data) {
        if (data.error) { showError('createError', 'Server error: ' + data.error); return; }
        gameCode     = data.code;
        state        = data.state;
        localVersion = data.state.version;
        curHalf   = 'v';
        curInning = 1;
        curOuts   = 0;
        buildScoreboard();
        showScoreboard();
        scaleToWindow();
        document.getElementById('gameCodeDisplay').textContent = gameCode;
        chgInning('v1');
        startPolling();
    });
}

function joinGame() {
    clearErrors();
    var code = document.getElementById('codeInput').value.trim();
    if (!/^\d{6}$/.test(code)) {
        showError('joinError', 'Enter the 6-character code from your opponent.');
        return;
    }
    apiGet(code, 0, function(data) {
        if (data.error === 'not_found') { showError('joinError', 'Game not found. Check the code and try again.'); return; }
        if (data.error)                 { showError('joinError', 'Server error: ' + data.error); return; }
        gameCode     = code;
        state        = data.state;
        localVersion = data.state.version;
        curHalf   = state.curHalf;
        curInning = Number(state.curInning);
        curOuts   = Number(state.curOuts);
        buildScoreboard();
        showScoreboard();
        scaleToWindow();
        document.getElementById('gameCodeDisplay').textContent = gameCode;
        chgInning(curHalf + curInning);
        updateOutCounter(curOuts);
        startPolling();
    });
}

function newGame() {
    stopPolling();
    gameCode     = null;
    localVersion = 0;
    state        = {};
    showLanding();
}

// ---- Polling ----

function startPolling() {
    stopPolling();
    pollTimer = setInterval(function() {
        if (!gameCode) { return; }
        if (pushTimer !== null) { return; } // don't overwrite pending local changes
        apiGet(gameCode, localVersion, function(data) {
            if (!data.state) { return; }
            state        = data.state;
            localVersion = data.state.version;
            curHalf   = state.curHalf;
            curInning = Number(state.curInning);
            curOuts   = Number(state.curOuts);
            refreshScoreboardDOM();
        });
    }, 1500);
}

function stopPolling() {
    if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null; }
}

// ---- Scaling ----

function scaleToWindow() {
    var container   = document.getElementById('scoreContainer');
    var widgetTable = document.getElementById('widgetTable');
    var scoreTable  = document.getElementById('scoreTable');
    if (!container || !widgetTable || !scoreTable) { return; }

    // reset to measure natural sizes
    container.style.transform    = '';
    container.style.marginBottom = '';
    scoreTable.style.width       = '';

    // getBoundingClientRect gives the true float width; ceil ensures score table
    // is never narrower than the widget table due to sub-pixel rounding
    scoreTable.style.width = Math.ceil(widgetTable.getBoundingClientRect().width) + 'px';

    // scale the container to fill the viewport (clientWidth excludes scrollbar)
    var naturalWidth = container.offsetWidth;
    if (naturalWidth <= 0) { return; }
    var scale = (document.documentElement.clientWidth - 16) / naturalWidth;

    container.style.transform       = 'scale(' + scale + ')';
    container.style.transformOrigin = 'left top';
    // compensate: transform doesn't affect layout height
    container.style.marginBottom = ((container.offsetHeight * scale) - container.offsetHeight) + 'px';
}

// ---- DOM building ----

function buildScoreboard() {
    var maxInning = 9;
    var table = document.getElementById('scoreTable');
    table.innerHTML = '';

    // Header row
    var thead = document.createElement('thead');
    var hr    = document.createElement('tr');
    hr.style.height = '50px';

    var outsTh = document.createElement('th');
    outsTh.id        = 'outs';
    outsTh.className = 'outs';
    outsTh.innerHTML = '&EmptySmallSquare;&EmptySmallSquare;&EmptySmallSquare;';
    hr.appendChild(outsTh);
    appendTh(hr, '&nbsp;');

    for (var i = 1; i <= maxInning; i++) {
        appendTh(hr, i);
        if (i % 3 === 0) { appendTh(hr, '&nbsp;'); }
    }
    ['&nbsp;', 'R', 'H', 'E', 'K'].forEach(function(lbl) { appendTh(hr, lbl); });
    thead.appendChild(hr);
    table.appendChild(thead);

    // Team rows
    var tbody = document.createElement('tbody');
    ['v', 'h'].forEach(function(half) {
        var name = (half === 'v') ? state.vName : state.hName;
        var line = (half === 'v') ? state.vLine : state.hLine;
        var row  = document.createElement('tr');
        row.style.height = '50px';

        var nameTd = document.createElement('td');
        nameTd.id             = half + 'Name';
        nameTd.style.textAlign = 'left';
        nameTd.textContent    = name;
        row.appendChild(nameTd);

        var spacer = document.createElement('td');
        spacer.innerHTML = '&nbsp;';
        row.appendChild(spacer);

        for (var i = 1; i <= maxInning; i++) {
            var td = document.createElement('td');
            td.id        = half + i;
            td.className = 'val';
            td.setAttribute('onclick', 'chgInning(this.id)');
            td.textContent = (line[i - 1] !== undefined) ? line[i - 1] : '';
            row.appendChild(td);
            if (i % 3 === 0) {
                var sep = document.createElement('td');
                sep.innerHTML = '&nbsp;';
                row.appendChild(sep);
            }
        }

        var runs = (line || []).reduce(function(a, b) { return a + b; }, 0);
        appendStatTd(row, '&nbsp;');
        appendValTd(row, half + 'Runs',   runs);
        appendValTd(row, half + 'Hits',   (half === 'v') ? state.vHits   : state.hHits);
        appendValTd(row, half + 'Errors', (half === 'v') ? state.vErrors : state.hErrors);
        appendValTd(row, half + 'Ks',     (half === 'v') ? state.vKs     : state.hKs);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);
}

function appendTh(row, html) {
    var th = document.createElement('th');
    th.innerHTML = html;
    row.appendChild(th);
}

function appendValTd(row, id, value) {
    var td = document.createElement('td');
    td.id        = id;
    td.className = 'val';
    td.textContent = value;
    row.appendChild(td);
}

function appendStatTd(row, html) {
    var td = document.createElement('td');
    td.innerHTML = html;
    row.appendChild(td);
}

// ---- DOM refresh (called when remote state arrives) ----

function refreshScoreboardDOM() {
    var maxInning = getMaxInning();
    ['v', 'h'].forEach(function(half) {
        var line = (half === 'v') ? state.vLine : state.hLine;
        for (var i = 1; i <= maxInning; i++) {
            var cell = document.getElementById(half + i);
            if (cell) {
                cell.textContent = (line[i - 1] !== undefined) ? line[i - 1] : '';
                cell.className   = 'val';
            }
        }
        var runs = (line || []).reduce(function(a, b) { return a + b; }, 0);
        document.getElementById(half + 'Runs').textContent   = runs;
        document.getElementById(half + 'Hits').textContent   = (half === 'v') ? state.vHits   : state.hHits;
        document.getElementById(half + 'Errors').textContent = (half === 'v') ? state.vErrors : state.hErrors;
        document.getElementById(half + 'Ks').textContent     = (half === 'v') ? state.vKs     : state.hKs;
    });

    var sel = document.getElementById(curHalf + curInning);
    if (sel) { sel.className = 'selectedCell'; }
    updateOutCounter(curOuts);
}

// ---- State sync ----

function updateLinescores() {
    var maxInning = getMaxInning();
    state.vLine = [];
    state.hLine = [];
    var vRuns = 0;
    var hRuns = 0;

    for (var i = 1; i <= maxInning; i++) {
        var vc = document.getElementById('v' + i);
        var hc = document.getElementById('h' + i);
        if (vc && vc.textContent !== '') {
            var v = Number(vc.textContent);
            state.vLine[i - 1] = v;
            vRuns += v;
        }
        if (hc && hc.textContent !== '') {
            var h = Number(hc.textContent);
            state.hLine[i - 1] = h;
            hRuns += h;
        }
    }
    document.getElementById('vRuns').textContent = vRuns;
    document.getElementById('hRuns').textContent = hRuns;
}

function updateState() {
    updateLinescores();
    state.vHits   = Number(document.getElementById('vHits').textContent);
    state.vErrors = Number(document.getElementById('vErrors').textContent);
    state.vKs     = Number(document.getElementById('vKs').textContent);
    state.hHits   = Number(document.getElementById('hHits').textContent);
    state.hErrors = Number(document.getElementById('hErrors').textContent);
    state.hKs     = Number(document.getElementById('hKs').textContent);
    state.curHalf   = curHalf;
    state.curInning = curInning;
    state.curOuts   = curOuts;
    debouncedPush();
}

function debouncedPush() {
    if (pushTimer !== null) { clearTimeout(pushTimer); }
    pushTimer = setTimeout(function() {
        apiUpdate(function() { pushTimer = null; });
    }, 2000);
}

// ---- Gameplay (logic preserved from original) ----

function getMaxInning() {
    var maxInning = 9;
    var cells = document.querySelectorAll('TD');
    cells.forEach(function(c) {
        if (c.id.match(/v\d+/)) {
            var inn = Number(c.id.substring(1));
            if (maxInning < inn) { maxInning = inn; }
        }
    });
    return maxInning;
}

function chgInning(id) {
    curHalf   = id.substring(0, 1);
    curInning = Number(id.substring(1));

    var cells = document.querySelectorAll('TD');
    cells.forEach(function(c) {
        if (c.id.match(/[vh]\d+/)) {
            c.className = 'val';
            if (
                (curInning > Number(c.id.substring(1)))
                ||
                (curInning === Number(c.id.substring(1)) && c.id.substring(0, 1) === 'v' && curHalf === 'h')
            ) {
                c.textContent = Number(c.textContent) || 0;
            }
        }
    });

    curOuts = 0;
    updateOutCounter(0);

    var maxInning = getMaxInning();
    maxInning = 9; // extra innings disabled
    if (curInning > maxInning) {
        curInning = maxInning;
        id = curHalf + curInning;
    }

    document.getElementById(id).className = 'selectedCell';
    updateState();
}

function updateOutCounter(outs) {
    var strOuts = '';
    for (var i = 0; i < 3; i++) {
        strOuts += (i < curOuts) ? '&FilledSmallSquare;' : '&EmptySmallSquare;';
    }
    document.getElementById('outs').innerHTML = strOuts;
}

function chgOuts(i) {
    curOuts = Number(curOuts) + i;
    if (curOuts >= 3) {
        var s = document.getElementById(curHalf + curInning);
        s.textContent = Number(s.textContent) || 0;

        if (curHalf === 'v') {
            curHalf = 'h';
        } else {
            curHalf = 'v';
            curInning = curInning + 1;
        }
        curOuts = 0;
        chgInning(curHalf + curInning);
    } else {
        if (curOuts < 0) { curOuts = 0; }
        updateOutCounter(curOuts);
        updateState();
    }
}

function chgRuns(i) {
    var c = document.getElementById(curHalf + curInning);
    var curRuns = Number(c.textContent) + i;
    if (curRuns < 0) { curRuns = 0; }
    c.textContent = curRuns;
    updateState();
}

function chgHits(i) {
    var c = document.getElementById(curHalf + 'Hits');
    var curHits = Number(c.textContent) + i;
    if (curHits < 0) { curHits = 0; }
    c.textContent = curHits;
    updateState();
}

function chgErrors(i) {
    var oppTeam = (curHalf === 'h') ? 'v' : 'h';
    var c = document.getElementById(oppTeam + 'Errors');
    var curErrors = Number(c.textContent) + i;
    if (curErrors < 0) { curErrors = 0; }
    c.textContent = curErrors;
    updateState();
}

function chgKs(i) {
    var oppTeam = (curHalf === 'h') ? 'v' : 'h';
    var c = document.getElementById(oppTeam + 'Ks');
    var curKs = Number(c.textContent) + i;
    if (curKs < 0) { curKs = 0; }
    c.textContent = curKs;
    updateState();
}

window.onload = function() {
    showLanding();
    window.addEventListener('resize', function() {
        if (document.getElementById('scoreboardView').style.display !== 'none') {
            scaleToWindow();
        }
    });
};

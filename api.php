<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$gamesDir = __DIR__ . '/games/';
$action   = $_GET['action'] ?? '';

// ---- Helpers ----

function validateCode($code) {
    return preg_match('/^\d{6}$/', $code) === 1;
}

function generateCode($gamesDir) {
    $chars = '0123456789';
    $len   = strlen($chars);
    do {
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[random_int(0, $len - 1)];
        }
    } while (file_exists($gamesDir . $code . '.json'));
    return $code;
}

function validateState($raw) {
    $s = [];

    // Team names: strip control chars, max 50 chars
    foreach (['vName', 'hName'] as $k) {
        $s[$k] = substr(preg_replace('/[\x00-\x1F\x7F]/', '', $raw[$k] ?? ''), 0, 50);
        if ($s[$k] === '') { $s[$k] = ($k === 'vName') ? 'Visitor' : 'Home'; }
    }

    // Line scores: arrays of non-negative ints, max 20 innings
    foreach (['vLine', 'hLine'] as $k) {
        $arr = isset($raw[$k]) && is_array($raw[$k]) ? array_slice($raw[$k], 0, 20) : [];
        $s[$k] = array_values(array_map(function($v) { return max(0, intval($v)); }, $arr));
    }

    // Per-team counting stats
    foreach (['vHits', 'vErrors', 'vKs', 'hHits', 'hErrors', 'hKs'] as $k) {
        $s[$k] = max(0, intval($raw[$k] ?? 0));
    }

    // Game cursor
    $s['curOuts']   = max(0, min(2, intval($raw['curOuts']   ?? 0)));
    $s['curHalf']   = in_array($raw['curHalf'] ?? '', ['v', 'h'], true) ? $raw['curHalf'] : 'v';
    $s['curInning'] = max(1, min(9, intval($raw['curInning'] ?? 1)));

    return $s;
}

function cleanup($gamesDir) {
    $cutoff = time() - (48 * 3600);
    foreach (glob($gamesDir . '*.json') as $file) {
        $data = json_decode(@file_get_contents($file), true);
        if ($data && isset($data['updated_at']) && $data['updated_at'] < $cutoff) {
            @unlink($file);
        }
    }
}

function jsonError($msg) {
    echo json_encode(['error' => $msg]);
    exit;
}

// ---- Routes ----

switch ($action) {

    case 'new':
        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) { jsonError('invalid_body'); }

        if (!is_dir($gamesDir)) {
            mkdir($gamesDir, 0755, true);
            // protect the directory if .htaccess wasn't uploaded
            file_put_contents($gamesDir . '.htaccess', "Deny from all\n");
        }

        $code  = generateCode($gamesDir);
        $state = validateState($body);
        $state['version']    = 1;
        $state['updated_at'] = time();

        file_put_contents($gamesDir . $code . '.json', json_encode($state));
        echo json_encode(['code' => $code, 'state' => $state]);
        break;

    case 'get':
        $code = $_GET['code'] ?? '';
        if (!validateCode($code)) { jsonError('invalid_code'); }

        $file = $gamesDir . $code . '.json';
        if (!file_exists($file)) { jsonError('not_found'); }

        // piggyback cleanup on reads so no cron is needed
        cleanup($gamesDir);

        $state         = json_decode(file_get_contents($file), true);
        $clientVersion = intval($_GET['version'] ?? 0);

        if ($state['version'] <= $clientVersion) {
            echo json_encode(['unchanged' => true]);
        } else {
            echo json_encode(['state' => $state]);
        }
        break;

    case 'update':
        $code = $_GET['code'] ?? '';
        if (!validateCode($code)) { jsonError('invalid_code'); }

        $file = $gamesDir . $code . '.json';
        if (!file_exists($file)) { jsonError('not_found'); }

        $body = json_decode(file_get_contents('php://input'), true);
        if (!$body) { jsonError('invalid_body'); }

        $state = null;
        $fp    = fopen($file, 'c+');
        if ($fp && flock($fp, LOCK_EX)) {
            $content  = stream_get_contents($fp);
            $existing = json_decode($content, true);

            $state               = validateState($body);
            $state['version']    = (isset($existing['version']) ? (int)$existing['version'] : 0) + 1;
            $state['updated_at'] = time();

            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($state));
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        if ($fp) { fclose($fp); }

        echo json_encode(['state' => $state ?? ['error' => 'lock_failed']]);
        break;

    default:
        jsonError('unknown_action');
}

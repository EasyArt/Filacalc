<?php
// api.php — JSON-API for Filaments (JSON file in ./data)
//
// Compatible with PHP 5.6+ (no arrow functions).
// Emits JSON even on fatal errors so you never get a blank 500.
//
// Endpoints:
//   GET    api.php?api=filaments
//   POST   api.php?api=filaments                     {brand,type,color,price}
//   PUT    api.php?api=filaments/{id}                {brand,type,color,price}   (via POST + _method=PUT allowed)
//   DELETE api.php?api=filaments/{id}                (via POST + _method=DELETE allowed)
//   GET    api.php?api=health

// ---------- Hardening: always return JSON on error ----------
header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', '0'); // don't leak HTML; we print JSON below

set_exception_handler(function($e){
  http_response_code(500);
  echo json_encode(['error' => 'Exception: '.$e->getMessage()], JSON_UNESCAPED_UNICODE);
  exit;
});
set_error_handler(function($severity, $message, $file, $line){
  // convert to ErrorException so exception handler above runs
  throw new ErrorException($message, 0, $severity, $file, $line);
});
register_shutdown_function(function(){
  $err = error_get_last();
  if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
    http_response_code(500);
    echo json_encode(['error' => 'Fatal: '.$err['message'].' @ '.$err['file'].':'.$err['line']], JSON_UNESCAPED_UNICODE);
  }
});

// ---------- Storage ----------
$DATA_DIR = __DIR__ . '/data';
$JSON_DB  = $DATA_DIR . '/filaments.json';

if (!is_dir($DATA_DIR)) { @mkdir($DATA_DIR, 0775, true); }
if (!file_exists($JSON_DB)) {
  @file_put_contents($JSON_DB, json_encode(["items"=>[]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function json_db_read($path) {
  $raw = @file_get_contents($path);
  $data = json_decode($raw ? $raw : '{}', true);
  if (!is_array($data)) $data = [];
  return isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
}
function json_db_write($path, $items) {
  $fp = fopen($path, 'c+');
  if (!$fp) throw new Exception('Kann JSON-Datei nicht öffnen (Schreibrechte?)');
  if (!flock($fp, LOCK_EX)) throw new Exception('Dateisperre fehlgeschlagen');
  ftruncate($fp, 0);
  $ok = fwrite($fp, json_encode(["items"=>$items], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
  if ($ok === false) throw new Exception('Schreiben fehlgeschlagen');
}
function jsonResponse($data, $code=200) {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
function generate_id() {
  if (function_exists('random_bytes')) {
    return bin2hex(random_bytes(6));
  }
  return substr(str_replace('.', '', uniqid('', true)), 0, 12);
}

// ---------- Router ----------
if (!isset($_GET['api'])) {
  jsonResponse(['error'=>'no api path'], 404);
}

$path   = $_GET['api'];
$method = $_SERVER['REQUEST_METHOD'];

// Read body & support method-override via JSON or form
$RAW   = file_get_contents('php://input');
$JSON  = json_decode($RAW ?: 'null', true);
$POSTF = $_POST ?: [];
if ($method === 'POST') {
  if (is_array($JSON) && isset($JSON['_method'])) {
    $method = strtoupper($JSON['_method']);
  } elseif (isset($POSTF['_method'])) {
    $method = strtoupper($POSTF['_method']);
  }
}

// ---- Health ----
if ($path === 'health') {
  jsonResponse(['ok'=>true, 'php'=>PHP_VERSION], 200);
}

// ---- List ----
if ($path === 'filaments' && $method === 'GET') {
  $items = json_db_read($JSON_DB);
  // sort: brand, type, color (PHP 5.6 compatible comparator)
  usort($items, function($a,$b){
    $aa = array($a['brand'],$a['type'],$a['color']);
    $bb = array($b['brand'],$b['type'],$b['color']);
    if ($aa == $bb) return 0;
    return ($aa < $bb) ? -1 : 1;
  });
  jsonResponse(['items'=>$items], 200);
}

// ---- Create ----
if ($path === 'filaments' && $method === 'POST') {
  $input = is_array($JSON) ? $JSON : $POSTF;
  $brand = trim(isset($input['brand']) ? $input['brand'] : '');
  $type  = trim(isset($input['type'])  ? $input['type']  : '');
  $color = trim(isset($input['color']) ? $input['color'] : '');
  $price = (float)(isset($input['price']) ? $input['price'] : 0);
  if ($brand===''||$type===''||$color===''||$price<=0) {
    jsonResponse(['error'=>'brand/type/color/price required'], 400);
  }

  $items = json_db_read($JSON_DB);
  $id = generate_id();
  $items[] = array('id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price);
  json_db_write($JSON_DB, $items);

  jsonResponse(array('id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price), 201);
}

// ---- Item routes ----
if (preg_match('#^filaments/([a-zA-Z0-9]+)$#', $path, $m)) {
  $id = $m[1];

  if ($method === 'PUT') {
    $input = is_array($JSON) ? $JSON : $POSTF;
    $brand = trim(isset($input['brand']) ? $input['brand'] : '');
    $type  = trim(isset($input['type'])  ? $input['type']  : '');
    $color = trim(isset($input['color']) ? $input['color'] : '');
    $price = (float)(isset($input['price']) ? $input['price'] : 0);
    if ($brand===''||$type===''||$color===''||$price<=0) {
      jsonResponse(['error'=>'brand/type/color/price required'], 400);
    }

    $items = json_db_read($JSON_DB);
    $found = false;
    for ($i=0; $i<count($items); $i++) {
      if (isset($items[$i]['id']) && $items[$i]['id'] === $id) {
        $items[$i] = array('id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price);
        $found = true; break;
      }
    }
    if (!$found) jsonResponse(['error'=>'not found'], 404);

    json_db_write($JSON_DB, $items);
    jsonResponse(array('id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price), 200);
  }

  if ($method === 'DELETE') {
    $items = json_db_read($JSON_DB);
    $out = array();
    foreach ($items as $it) {
      if (!isset($it['id']) || $it['id'] !== $id) $out[] = $it;
    }
    json_db_write($JSON_DB, $out);
    jsonResponse(array('ok'=>true), 204);
  }

  if ($method === 'GET') {
    $items = json_db_read($JSON_DB);
    foreach ($items as $it) {
      if (isset($it['id']) && $it['id'] === $id) jsonResponse($it, 200);
    }
    jsonResponse(array('error'=>'not found'), 404);
  }
}

// Fallback
jsonResponse(array('error'=>'not found'), 404);

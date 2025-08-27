<?php
// api.php — JSON-API für Filamente

error_reporting(E_ALL);
ini_set('display_errors', '1');

$DATA_DIR  = __DIR__ . '/data';
$JSON_DB   = $DATA_DIR . '/filaments.json';
if (!is_dir($DATA_DIR)) { @mkdir($DATA_DIR, 0775, true); }
if (!file_exists($JSON_DB)) {
  @file_put_contents($JSON_DB, json_encode(["items"=>[]], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
}

function json_db_read($path) {
  $raw = @file_get_contents($path);
  $data = json_decode($raw ?: '{}', true);
  return $data['items'] ?? [];
}
function json_db_write($path, $items) {
  $fp = fopen($path, 'c+');
  if (!$fp) throw new Exception('Kann JSON-Datei nicht öffnen.');
  flock($fp, LOCK_EX);
  ftruncate($fp, 0);
  fwrite($fp, json_encode(["items"=>$items], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);
}
function jsonResponse($data, $code=200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

if (isset($_GET['api'])) {
  try {
    $path   = $_GET['api'];
    $method = $_SERVER['REQUEST_METHOD'];

    // Body 1x lesen & parsen, Method-Override auch aus JSON erkennen
    $RAW   = file_get_contents('php://input');
    $JSON  = json_decode($RAW ?: 'null', true);
    $POSTF = $_POST ?? [];
    if ($method === 'POST') {
      if (is_array($JSON) && isset($JSON['_method']))      $method = strtoupper($JSON['_method']);
      elseif (isset($POSTF['_method']))                    $method = strtoupper($POSTF['_method']);
    }

    if ($path === 'filaments' && $method === 'GET') {
      $items = json_db_read($JSON_DB);
      usort($items, fn($a,$b)=>[$a['brand'],$a['type'],$a['color']]<=>[$b['brand'],$b['type'],$b['color']]);
      jsonResponse(['items'=>$items, 'backend'=>'json']);
    }

    if ($path === 'filaments' && $method === 'POST') {
      $input = is_array($JSON) ? $JSON : $POSTF;
      $brand = trim($input['brand'] ?? '');
      $type  = trim($input['type']  ?? '');
      $color = trim($input['color'] ?? '');
      $price = (float)($input['price'] ?? 0);
      if ($brand===''||$type===''||$color===''||$price<=0) throw new Exception('brand/type/color/price required');

      $items = json_db_read($JSON_DB);
      $id = bin2hex(random_bytes(6));
      $items[] = ['id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price];
      json_db_write($JSON_DB, $items);
      jsonResponse(['id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price], 201);
    }

    if (preg_match('#^filaments/([a-zA-Z0-9]+)$#', $path, $m)) {
      $id = $m[1];

      if ($method === 'PUT') {
        $input = is_array($JSON) ? $JSON : $POSTF;
        $brand = trim($input['brand'] ?? '');
        $type  = trim($input['type']  ?? '');
        $color = trim($input['color'] ?? '');
        $price = (float)($input['price'] ?? 0);
        if ($brand===''||$type===''||$color===''||$price<=0) throw new Exception('brand/type/color/price required');

        $items = json_db_read($JSON_DB);
        $found = false;
        foreach ($items as &$it) {
          if ($it['id'] === $id) { $it = ['id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price]; $found = true; break; }
        }
        if (!$found) throw new Exception('not found');
        json_db_write($JSON_DB, $items);
        jsonResponse(['id'=>$id,'brand'=>$brand,'type'=>$type,'color'=>$color,'price'=>$price]);
      }

      if ($method === 'DELETE') {
        $items = json_db_read($JSON_DB);
        $items = array_values(array_filter($items, fn($it)=>$it['id']!==$id));
        json_db_write($JSON_DB, $items);
        jsonResponse(['ok'=>true], 204);
      }

      if ($method === 'GET') {
        $items = json_db_read($JSON_DB);
        foreach ($items as $it) { if ($it['id'] === $id) jsonResponse($it); }
        jsonResponse(['error'=>'not found'],404);
      }
    }

    if ($path === 'health') { jsonResponse(['ok'=>true,'backend'=>'json']); }
    jsonResponse(['error'=>'not found'],404);
  } catch (Throwable $e) {
    jsonResponse(['error'=>$e->getMessage()], 400);
  }
} else {
  jsonResponse(['error'=>'no api path'],404);
}

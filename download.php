<?php
$json = json_decode($_REQUEST['input']);
$file = 'temp/' . uniqid() . '.json';
file_put_contents($file, json_encode($json, JSON_PRETTY_PRINT));
header("Content-Description: File Transfer"); 
header("Content-Type: application/octet-stream"); 
header("Content-Disposition: attachment; filename='" . basename($_REQUEST['name']) . "'"); 
readfile ($file);
exit(); 
?>
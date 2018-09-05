<?php
$json = '';
function compressString($_str) {
	return preg_replace("/[\\s\\t\\n]+/", " ", $_str);
}

$content = compressString($_REQUEST['html1']);
if(isset($_REQUEST['html2']) && !empty($_REQUEST['html2'])) {
	$content = json_encode([$content, compressString($_REQUEST['html2'])]);
}

$document_fields_pos = json_decode($_REQUEST['pos1']);
if(isset($_REQUEST['pos2']) && !empty($_REQUEST['pos2'])) {
	$document_fields_pos = [$document_fields_pos, json_decode($_REQUEST['pos2'])];
}
$document_fields_pos = json_encode($document_fields_pos);

$json = array(
	"content" => $content,
	"document_fields_pos" => $document_fields_pos,
	"signature_scale" => 0.7,
	"font_size" => intval($_REQUEST['fontSize']),
	"signature_required" => intval($_REQUEST['signReqd']),
	"is_customized_done" => 1
);
if(isset($_REQUEST['signers']) && !empty($_REQUEST['signers'])) {
	$json['signers'] = json_decode($_REQUEST['signers']);
}
$json = json_encode($json, JSON_PRETTY_PRINT);

echo $json;
?>

<?php
$uploaddir = '/var/www/uploads/';
$uploadfile = $uploaddir . basename($_FILES['files']['name']);
echo $_FILES['files']['tmp_name']."\n";
if (move_uploaded_file($_FILES['files']['tmp_name'], $uploadfile)) {
	echo '{"status": "ok"}';
} else {
	echo $_FILES['files']['error'] ;
}
?>
# Networked

*Converted from: Networked.pdf*

---

# Networked
## **14 [th] November 2019 / Document No D19.100.53**

**Prepared By: MinatoTW**

**Machine Author: guly**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 12


## **SYNOPSIS**

Networked is an Easy difficulty Linux box vulnerable to file upload bypass, leading to code

execution. Due to improper sanitization, a crontab running as the user can be exploited to

achieve command execution. The user has privileges to execute a network configuration script,

which can be leveraged to execute commands as root.


## **Skills Required**


  - Enumeration

  - Source code review


## **Skills Learned**


  - File upload bypass

  - Command injection



Page 2 / 12


## **Enumeration** **Nmap**





We find SSH and Apache open on their usual ports.

## **Apache**


the following message is seen on browsing to port 80.



Page 3 / 12


## **Gobuster**

Let’s run gobuster to discover files and folders.


The upload.php lets us upload files and the photos.php displays them. The backup folder

contains a tar archive, which seems interesting. Let’s download and examine it.


We obtained the source for the PHP files. Looking at the upload.php, we see it checking the file

type:





Page 4 / 12


​ ​ ​ ​



The check_file_type function is present in the lib.php file:


​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​



This in turn calls file_mime_type(), and rejects the file if it’s not an image. The check_file_type()

function uses mime_content_type() to get the MIME type.


​ ​ ​ ​



​ ​ ​ ​



The [mime_content_type()​](https://www.php.net/manual/en/function.mime-content-type.php) determines the filetype based on it’s ​ [magic bytes​](https://en.wikipedia.org/wiki/List_of_file_signatures), which means that ​

we can include magic bytes for a PNG file at the beginning and bypass the filter.



​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​


Page 5 / 12


The code only accepts image extensions, although it doesn’t check if it has any other extension
before them. This can be exploited by adding “.php” before a valid extension, which can be
exploitable, depending on the Apache configuration. Let’s try uploading a normal PHP shell with
a PNG extension first.





As expected, the image gets rejected due to invalid MIME type. The magic bytes for PNG are “89

50 4E 47 0D 0A 1A 0A”, which can be added to the beginning of the shell.


The file can now be uploaded, let's look at the gallery now.


Page 6 / 12


We see our file as a broken image. Right-click on it and select “View image” to navigate to it.


We’re able to execute commands as the apache user. Next, curl can be used to execute a bash

reverse shell.


Page 7 / 12


## **Lateral Movement**

Browsing to the home folder of the user, two files named check_attack.php and crontab.guly are

found.


From examining the crontab file, we see that the check_attack.php script is executed every 3
minutes.





Here are the contents of the check_attack.php file:





Page 8 / 12


The script lists files in the /uploads folder and checks if it is valid based on filename. Any invalid
files are removed using the system exec() function.





The $value variable stores the filename, but isn’t sanitized by the script, which means that we can
inject commands through special file names. For example, a file named “; cmd” will result in the
command:





This will lead to the execution of the command specified by “cmd”. Let’s check if this works. The
command should be base64 encoded as we can’t use ‘/’ in file names.


Page 9 / 12


## **Privilege Escalation**

A shell as guly should be received in a while, after which we can spawn a tty.


Looking at the sudo privileges, we see that guly can execute changename.sh as root.


Here are the contents of changename.sh:


Page 10 / 12


​



​



The script creates a configuration for the guly0 network interface and uses “ifup guly0” to
activate it at the end. The user input is validated, and only alphanumeric characters, slashes or a
dash are allowed. Network configuration scripts on CentOS are vulnerable to command injection
[through the attribute values as described ​here. This is because the scripts are sourced by the​](https://seclists.org/fulldisclosure/2019/Apr/24)
underlying service, leading to execution of anything after a space.

We can exploit this by executing /bin/bash as root.


Page 11 / 12


Page 12 / 12



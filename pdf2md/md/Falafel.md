# Falafel

*Converted from: Falafel.pdf*

---

# Falafel
## **23 [rd] June 2018 / Document No D18.100.08**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Authors: dm0n & Stylish**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 9


## **SYNOPSIS**

Falafel is not overly challenging, however it requires several unique tricks and techniques in

order to successfully exploit. Numerous hints are provided, although proper enumeration is

needed to find them.


## **Skills Required**


  - Basic/intermediate knowledge of SQL

injection techniques

  - Intermediate/advanced knowledge of

Linux


## **Skills Learned**


  - Boolean-based SQL injection

  - Exploiting system file name restrictions

  - Exploiting video group permissions

  - Exploiting disk group permissions


Page 2 / 9


## **Enumeration** **Nmap**

Nmap reveals OpenSSH and Apache. Judging by the OpenSSH or Apache versions, it is likely

running Ubuntu Xenial Xerus.


Page 3 / 9


​

​ ​


## **Dirbuster**

Dirbuster finds a fairly substantial amount of files. If fuzzing for **txt** ​ files, an extra hint can be

obtained from the file **cyberlaw.txt** ​, which exposes the username **chris** ​ .


Page 4 / 9



​

​ ​


​


​


​

​


​


## **Exploitation** **SQL Injection & PHP Type Juggling**

The login page can be exploited with a boolean-based SQL injection. SQLMap is very useful,

however the --string flag must be specified for it to be successful. The command **sqlmap -r** ​

**login.req --level=5 --risk=3 --string="Wrong identification" --technique=B -T users -D falafel**

**--dump** will dump the users table, where **login.req** ​ is a file containing an intercepted login POST

request.


​

​


​



​


​


​

​


​



​


​


The **chris** ​ user’s password is a hint that type juggling can be used. As the admin hash begins with

**0e**, any other hash which also begins with **0e** ​ and is followed by all integers will be valid if a basic

== comparison is used. This is due to PHP converting both hashes to floats with a value of 0. A

​



​


​


​

​


quick search finds several options, with **240610708** ​ hashing to

**0e462097431906509019562988736854** as an example.



​


​


​

​


​


Page 5 / 9


## **File Upload**

When attempting to upload a file with a name longer than 236 chars, a message is returned

revealing that the file name has been changed. By creating a PHP file named A*232 followed by

.php.gif, the machine will cut off the .gif extension, leaving only A*232.php and allowing for code

execution.


Page 6 / 9


​ ​


## **Privilege Escalation** **Moshe**

The credentials for the **moshe** ​ user can be easily found in **/var/www/html/connection.php** ​ .

Re-using the database password with su or attempting to SSH as moshe will succeed.


Page 7 / 9



​ ​



​ ​


​


​


​


​


## **Yossi**

Some basic enumeration reveals that moshe is part of the **video** ​ group, which has read access to

video devices. A script such as LinEnum will also find that yossi is currently in an active TTY

session, so it can be assumed that a screenshot is required to progress.


Copying the contents of **/dev/fb0** ​ and attempting to open it with Gimp/Photoshop/etc reveals

seemingly useless image data. As the image processing program does not know the correct

resolution, it must be supplied before it will render correctly. The actual resolution can be

obtained from **/sys/class/graphics/fb0/virtual_size** ​ .


The password **MoshePlzStopHackingMe!** ​ can be used to SSH in directly as yossi.


Page 8 / 9



​


​


​


​


​

​


## **Root**

​

​



As yossi, checking the user groups again finds something interesting. As part of the **disk** ​ group,

​



​

yossi has full access to partitions mounted in /dev. Using **debugfs /dev/sda1** ​, it is possible to read



​

​

the root flag as well as root’s SSH priavte key.



​

​



​

​


Page 9 / 9



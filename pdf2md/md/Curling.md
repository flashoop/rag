# Curling

*Converted from: Curling.pdf*

---

# Curling
## **08 [th] May 2019 / Document No D19.100.19**

**Prepared By: MinatoTW**

**Machine Author: l4mpje**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 10


## **SYNOPSIS**

Curling is an Easy difficulty Linux box which requires a fair amount of enumeration. The password

is saved in a file on the web root. The username can be download through a post on the CMS

which allows a login. Modifying the php template gives a shell. Finding a hex dump and reversing

it gives a user shell. On enumerating running processes a cron is discovered which can be

exploited for root.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - Analyzing hex dump

  - Curl usage



Page 2 / 10


## **ENUMERATION** **NMAP**





Apache is running on port 80 and SSH on port 22.

## **APACHE**


Navigating to port 80 we come across a Joomla website.



Page 3 / 10


​ ​



The page contains two usernames “Super user” and Floris.


Checking the HTML source of the page reveals a comment saying secret.txt .


[Checking http://10.10.10.150/secret.txt​](http://10.10.10.150/secret.txt) we find a string which is base64 encoded. Decoding it ​

gives the string “Curling2018!”.



​ ​



​ ​



​ ​



​ ​



​ ​


Going to the admin page at http://10.10.10.150/administrator/ and trying to login with the

username Floris and password Curling2018! logs us in.


Page 4 / 10


## **FOOTHOLD**

Logging in gives us access to the control panel.


On the right side under Configuration click on Templates > Templates > Protostar.


Now click on a php file like index.php and add command execution.





Page 5 / 10


Click on save and navigate to /index.php to issue commands.


Now that we have RCE we can get a reverse shell.





Get a TTY shell by running,





Page 6 / 10


## **LATERAL MOVEMENT** **HEX DUMP**

Navigating /home/floris we find a file named password_backup.


The file looks like a hex dump done using xxd which can be reversed.





Page 7 / 10


The resulting file is bzip2 compressed.
The file appears to be repeatedly archived. The steps to decompress it are,





The file found was password.txt which is the password for floris. We can now SSH in as floris with
the discovered password.


Page 8 / 10


​ ​


​ ​


## **PRIVILEGE ESCALATION** **ENUMERATION**

We enumerate the running crons using [pspy​](https://github.com/DominicBreuker/pspy) .​ Download the smaller binary and transfer it the box.


​ ​



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​



​ ​


After letting it run for a minute we’ll find a cron running,


According to curl [manpage​](https://curl.haxx.se/docs/manpage.html), the -K option is used to specify a config file. The cron uses input as ​
the config and outputs to report.


The input file is owned by our group, so we can write our own config. From the manpage we
know that the “output” parameter can be used to specify the output file. We can create a
malicious crontab and overwrite it on the box.`


Page 9 / 10



​ ​


​ ​



​ ​


​ ​


## **MANIPULATING THE CONFIG**

First create a malicious crontab locally and start a simple http server.





Now edit the input config with the contents.





A shell should be received within a minute.



Page 10 / 10



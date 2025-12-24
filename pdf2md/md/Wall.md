# Wall

*Converted from: Wall.pdf*

---

# Wall
## **05 [th] December 2019 / Document No D19.100.56**

**Prepared By: MinatoTW**

**Machine Author: askar**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 17


## **SYNOPSIS**

Wall is a medium difficulty Linux machine running a vulnerable version of Centreon network

monitoring software, which can be accessed through HTTP Verb Tampering. The login page can

be brute-forced to gain Admin access, which is exploited to gain RCE. A compiled python file is

decompiled to extract user credentials This provides access to an SUID, resulting in a root shell.


## **Skills Required**


  - Enumeration

  - Scripting


## **Skills Learned**


  - HTTP Verb tampering

  - WAF bypass

  - Decompiling python code



Page 2 / 17


## **Enumeration** **Nmap**





SSH and Apache are found to be running on their usual ports.



Page 3 / 17


## **Apache**

Browsing to port 80, we come across the default Apache page.

## Gobuster


Running gobuster with a few threads and PHP extension.


The pages aa.php and panel.php don’t seem to be significant. However, the /monitoring folder
requests authentication.


Page 4 / 17


## **Verb Tampering**

It is possible to misconfigure Apache, such that authentication is only requested for a particular

method, leading to a basic authentication bypass. Start Burp and intercept the request to

/monitoring, then hit Ctrl+R to send it to Repeater. Change the request method to POST and send

the request.


The page didn’t return a “401 Unauthorized” error and is redirecting us to the Centreon login

page at /centreon, which means the bypass was successful.


Page 5 / 17


​

​ ​


​ ​



Centreon is a network monitoring software, which by default has the credentials **admin /** ​

**centreon** [as referenced here​](https://www.tenable.com/plugins/nessus/80225) . However, trying those credentials results in authentication failure. ​


Looking at the request, we find that it uses a CSRF token, which means that we can’t bruteforce it

directly. The CSRF token can be found in a hidden field in the HTML source.


We can write a simple python script to automatically grab this token and authenticate. We can

start with the [top-passwords-shortlist​](https://github.com/danielmiessler/SecLists/blob/master/Passwords/Common-Credentials/top-passwords-shortlist.txt) from seclists before attempting larger wordlists. ​



​

​ ​


​ ​



​

​ ​


​ ​



​

​ ​


​ ​



​

​ ​


​ ​



​

​ ​


​ ​


Page 6 / 17


The script uses BeautifulSoup to parse the page and extract the CSRF token, and then sends

login requests with passwords from the wordlist.


Page 7 / 17


​ ​


​



The password for admin is revealed to be “password1”. Logging in and browsing to the “About”

page we find the version to be 19.04.

## **Foothold** **CVE 2019-13024**


The technical details about the vulnerability can be found [here​](https://shells.systems/centreon-v19-04-remote-code-execution-cve-2019-13024/) . An attacker can inject OS level ​

commands due to a lack of sanitization in the “nagios_bin” input parameter while configuring

pollers. Click on the settings on the left side and go to Pollers > Pollers. An existing poller named

“Central” should be seen.


Click on the name to view the configuration settings, and then change the “Monitoring Engine

Binary” to “ **id;** ​ ”.


Page 8 / 17



​ ​


​



​ ​


​


Next, click on “Save” at the bottom to save the configuration.


According to the blogpost, sending a POST request to





with the parameters poller, debug and generate should execute the binary. Let’s try that.


As expected, the “id” command executed successfully and the output was returned. Let’s try

executing a bash reverse shell encoded as base64 to avoid bad characters.


Page 9 / 17


​



​



The input command would be:


​



​



​



Enter this command into the “Monitoring Engine Binary” input field.


However, clicking on save results in a “403 Foridden” error.


This means that there might be an additional protection or Web Application Firewall (WAF)

processing the input. Let’s try replacing spaces with **${IFS}** ​ and resending the request.



​



​



​



​



​


Page 10 / 17


This time there was no error and sending a request to generateFiles.php should give us a shell.

## **CVE-2019-16405 / CVE-2019-17501**


Centreon allows users to execute custom commands based on their preferences. Go to Settings

- Commands > Miscellaneous and click on “Add” to add a new command.


Enter “ps aux” into the “Command Line” field and the IP address to the box in the

$HOSTADDRESS$ field. Then click on the blue arrow on the right to execute the command on

the box.


Page 11 / 17


A new window opens and the process running on the box are listed. We didn’t receive a “403

Forbidden” error as the command was sent through the GET request while the WAF must be

configured to check only POST requests. This behaviour can be verified by clicking on “Save” at

the bottom, which should throw an error.


Let’s execute the base64 encoded shell from earlier.


The execution failed because the application escaped the pipes “\|” and converted it to a string.

Instead, we can try downloading a shell and executing it. Create a file with the contents:





And then transfer it to the box using wget.



Page 12 / 17


Next, execute /tmp/pwn using bash.


Clicking on the blue arrow should execute the command and return a shell like earlier.


Page 13 / 17


## **Lateral Movement**

After enumerating the file system, we come across /opt/.shelby/backup.


The file is a compiled python file, which generally have .pyc extension.


Running the file with python just returns “Done”. We can encode the file into base64 and then

copy and decode it locally.


This can be decompiled using uncompyle6, which can be installed using pip.


Page 14 / 17


Now rename the file and use uncompyle to decompile it.


The resulting output is:





Page 15 / 17


The script creates a password and then use it to transfer html.zip via SFTP. The password can be

extracted from the script by pasting the code into interpreter.


The output string can be used to SSH into the box as shelby.


Page 16 / 17


​ ​


## **Privilege Escalation**

After searching for SUID binaries, we find Screen 4.5.0 to be installed.


We come across come across [this​](https://www.exploit-db.com/exploits/41154) ​ vulnerability for Screen 4.5.0. We can download and execute

the script on the box directly, as GCC is installed.


Once the transfer completes, make the file executable and run the exploit, which should result in

a root shell.


Page 17 / 17



​ ​



​ ​



​ ​



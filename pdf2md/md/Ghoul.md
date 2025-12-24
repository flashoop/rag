# Ghoul

*Converted from: Ghoul.pdf*

---

# Ghoul
## **13 [th] November 2019 / Document No D19.100.XX**

**Prepared By: MinatoTW**

**Machine Author: egre55 & MinatoTW**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 27


## **SYNOPSIS**

Ghoul is a hard difficulty linux box which tests enumeration and situational awareness skills. A zip

file upload form is found to be vulnerable to ZipSlip, which can be used to upload a shell to the

web server. A few readable SSH keys are found on the box which can be used to gain shells as

other users. A user is found to have access to another host on the network. The second host is

found to have an older version of Gogs server running. A git repo found on the Gogs server is

found to contain sensitive information, which can be used to gain a shell as root. An incoming

SSH connection is found to be using SSH agent forwarding, and can be hijacked to gain root

shell on the host.


## **Skills Required**


  - Enumeration

  - Pivoting


## **Skills Learned**


  - ZipSlip vulnerability

  - Gogs RCE

  - Git reflog



Page 2 / 27


## **ENUMERATION** **NMAP**





We have SSH and Apache running on their common ports. There’s another SSH server (same
version) on port 2222. Tomcat is found to be running on port 8080.


Page 3 / 27


## **HTTP**

Navigating to port 80 we find a blog page.

## GOBUSTER


Running gobuster on the Apache server with PHP as the extension.





Page 4 / 27


The scan finds quite a few folders. Going to /archives and /uploads we see that they’re forbidden.
Browsing to the /users folder we find a login page.


The scan also found a page named secret.php. Let’s look at it.


It seems like a chat application. Scrolling down we find a user giving his access pass to another.

Let’s note it down for later.


Page 5 / 27


## **TOMCAT**

Browsing to port 8080 we find that the page requests authentication.


Let’s try a few common credentials like admin / password or admin / admin.


And using admin / admin we get in. The page looks like an image upload website. Let’s try

uploading an image to see if it works.


Click on upload and wait for it to return.


Page 6 / 27


The page says that it was uploaded successfully.


Let’s check if the uploads folder on Apache has saved our image.


It doesn’t seem to contain our file. So maybe the file is stored somewhere else or it’s name is

obfuscated. Going back to the upload page and clicking the arrows we find another upload form

for zip files.


Page 7 / 27


​ ​


​



After uploading a zip file and checking the archives folder, we also don’t find the file.

## **ZIPSLIP**


One vulnerability related to zip file format in the recent past has been [ZipSlip​](https://snyk.io/research/zip-slip-vulnerability) . The vulnerability​

allows a malicious zip file to write files to forbidden locations via path traversal when extracted.

Let’s try this on the box. Looking at the list of vulnerable applications we find Java and Tomcat

server runs on Java.


[We can use ​this tool to create a malicious zip file. Let’s use a PHP reverse shell from](https://github.com/ptoomey3/evilarc) [here​](https://raw.githubusercontent.com/pentestmonkey/php-reverse-shell/master/php-reverse-shell.php) and put

that into the archive. Download it and change the IP address and reverse shell port.



​ ​


​



​ ​


​



​ ​


​


And now create the zip file using the script. Let’s try writing a shell to the archives folder on

apache as it might be used for zip files. We start from a depth of 1 and keep incrementing until we

find our shell.



​ ​


​



​ ​


​



​ ​


​


Issuing the command the evil.zip was created with our path traversal. Let’s upload and see if the
file exists now.


And we get a 404 error.


Page 8 / 27



​ ​


​


## **FOOTHOLD**

Let’s repeat the above process with depth as 2.





Now upload the zip file.


Trying to CURL the page again, we see that it hits.


And we have a shell.



Page 9 / 27


## **LATERAL MOVEMENT** **ENUMERATION**

As Tomcat is running on the server, let’s look at the config files. They’re usually located at

/usr/share/tomcat*:


We see that it exists. The conf folder is supposed to contain the configuration files for Tomcat.

Looking at the file conf/tomcat-users.xml we find some credentials.


It contains the credentials admin / admin which we used to authenticate to tomcat and also admin

/ test@aogiri123. Let’s note it down for future enumeration


While enumerating the file system we find a backups folder in /var/backups.


Page 10 / 27


The folder seems to contain a keys folder readable by us. Let’s look into it.


There are three SSH private keys in the folder where eto.backup and noro.backup are

unencrypted but kaneki.backup is password protected, which maybe means that he has higher

privileges.


During our earlier enumeration we found an access pass “ILoveTouka”. Let’s try using it as the

SSH password. Copy the key to local box and then use it to SSH in.





And we see that it worked and we were able to login.



Page 11 / 27


## **MOVING TO KANEKI-PC**

We find two notes in the home folder of the user.


The first note says that the user has set up a file server in the network, and the second note talks

about a vulnerability in the Gogs server. Let’s keep this in mind.


Moving on looking into the .ssh folder for the user we find more than one authorized keys.


One of them is for the Aogiri host we are on and there’s another one for the host kaneki-pc for

the user kaneki_pub. This must be the file server the note talked about. Looking at the network

interfaces we notice that we aren’t on 10.10.10.101.


Let’s do a ping sweep to see which hosts are up in the subnet.


Page 12 / 27


This simple bash scripts helps in finding hosts on the network.





The script finds 172.20.0.150 to be up.


We can check if port 22 is open using the tcp file.





We see that there was no reply for port 22, however there was a connection refused for a closed
port.

This confirms that SSH is open on the host.


Page 13 / 27


Let’s try to SSH into it as the kaneki_pub user we discovered from the key.





The server asks for the password to the private key, which we already know is “ILoveTouka”, and
using this we get in.

We find a to-do.txt in the user’s folder which contains a username “AogiriTest”.

## **EXPLOITING GOGS**


From our earlier enumeration we know that there’s a Gogs server on the network. Looking at the

network interfaces we see that the server has two adapters.


Page 14 / 27


​ ​



Let’s try repeating the ping sweep on the eth1 interface. The script straight away finds 172.18.0.2

to be up.


From the Gogs [documentation​](https://gogs.io/docs/advanced/configuration_for_source_builds) ​ we know that it runs on port 3000 by default. Let’s check if this is

open.


We see that it’s open, but in order to login we’ll have to forward the port to our host. This will

need double forwarding. Once from the kaneki-pc host and once from the Aogiri host as we don’t

have direct access to the Gogs host. It can be imagined like this:


Let’s try that, first SSH into 10.10.10.101 then forward port 3000 from 172.18.0.2 through kaneki-pc.


Page 15 / 27



​ ​



​ ​



​ ​



​ ​


Now forward port 3000 from Aogiri localhost to our localhost.


And now we should be able to access Gogs on our localhost port 3000.


We already have the username AogiriTest. Let’s use the password we gained from the

tomcat-users.xml “test@aogiri123”.


Page 16 / 27


​ ​

​



The login is successful, and at the bottom of the application we see Gogs version 0.11.66.


[Looking at the CVEs we find CVE-2018-18925​](https://nvd.nist.gov/vuln/detail/CVE-2018-18925) .​ A technical post on the exploitation can be found

[here ( Use Google translate to view the page ). ​](https://www.anquanke.com/post/id/163575)


Let’s try replicating it, first we need to create a cookie. Looking at the page we find the source

code for making the cookie.



​ ​

​



​ ​

​



​ ​

​



​ ​

​


Page 17 / 27


We already know that the admin user is kaneki. The default uid for admin is 1 which makes his old

uid to 0. Copy the code and create a cookie.





It saves the cookie in a file named data, Now go back to the Gogs page and create a repository.


Fill it with dummy information then select upload file and upload the cookie.


Click on commit changes to finish the upload. Then create another file to finish creating the


Page 18 / 27


repository. At the top, click on “New file” and then enter some contents. Here’s how the repo

looks like now:


Now we need to find the repository number, for that right click on Fork and click on Inspect

element.


In the HTML source we find the repo path as /repo/fork/id which in this case is 2.


Gogs stores it’s repositories in a folder /data/tmp-repo/id/ and the sessions in /data/sessions. So

our repository should be located at /data/tmp-repo/2/ and the cookie file at

/data/tmp-repo/2/data. If we change our session to be ../tmp-repo/2/data the server should read

from it and change our session to kaneki. Let’s do that.


In the browser’s storage console change the value for i_like_gogits to ../tmp-repo/2/data.


Page 19 / 27


And then on refreshing the page we should be logged in as kaneki.


As an admin, a user can create git-hooks and execute code through it. Click on settings > Git

hooks > Post receive.


Now we can add a bash script to execute a reverse shell when a commit is made.


Page 20 / 27


Then click on update hook to save it. Now head back to the repo and upload / create a new file,

and then start a listener. Then clicking on commit changes should give us a shell.

## **PRIVILEGE ESCALATION ON GOGS**


We get a shell as the user git. Searching for suid files we find a file named gosu.


Page 21 / 27


​



[Searching about it we find that it is a Go version of su. Let’s try executing it. Looking at the usage ​](https://github.com/tianon/gosu)

we need to mention the username and command.


And we have a root shell on Gogs. Navigating to the root folder we find an archive named

aogiri-app.7z.


Let’s transfer it using nc to inspect the contents.



​



​



​



​



​


Page 22 / 27


## **INSPECTING GIT REPOSITORY**

After extracting and getting into the folder we find that it’s a git repository with maven and spring

boot.


Let’s check the commit for sensitive information.





Looking at the commits we see a password in the application.properties file.



Page 23 / 27


​ ​



The only place suitable to try this is the root on kaneki-pc. However we find that it doesn’t work.

Sometimes the commits in a git repo are reset or reverted by users. This is hidden from the

normal logs but can be view using [reflog​](https://git-scm.com/docs/git-reflog) .​



​ ​



​ ​



​ ​


Issuing the command we see two more commits which were reverted. And we find two more
passwords.


Trying these one by one to su on kaneki-pc we find that the password “7^Grc%C\7xEQ?tb4”
works for root.


Page 24 / 27



​ ​



​ ​


​ ​


​ ​


## **PRIVILEGE ESCALATION** **ENUMERATION**

Now that we have a root shell, let’s run an enumeration tool such as [pspy​](https://github.com/DominicBreuker/pspy) ​ to monitor file and

system events. Transfer it to the box using simple HTTP server.


​ ​



​ ​


​ ​



​ ​


​ ​



​ ​


After a while we that kaneki_adm is using ssh to execute commands on 172.18.0.1.


Looking at the logged in users we see that he is also logged in from 172.20.0.1.


This means that he’s using kaneki-pc as an intermediate host to SSH from 172.20.0.1 to 172.18.0.1.

This is done using SSH [Agent Forwarding​](https://www.ssh.com/ssh/agent) . The agent saves the user’s authority and forwards to it​

the host which asks for it. Looking at the /etc/ssh/ssh_config file we see that ForwardAgent is set

to yes.


Page 25 / 27



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


These files are usually located in /tmp folder as socket files. Let’s check these.


We see four folders with SSH agents and one of them is recently created which must be the one

used to SSH to 172.18.0.1. Normally, users are not permitted to access the socket files of another

user, but root has no such restrictions.


Let’s use the watch command to monitor the file creation and wait for the user to login.





As soon as a new folder is created Ctrl-C out of watch and get into the folder.





Then use the SSH_AUTH_SOCK environment variable to specify an alternative socket to SSH.


Page 26 / 27


Following the steps above we have a root shell on the host!



Page 27 / 27



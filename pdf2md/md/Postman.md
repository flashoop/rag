# Postman

*Converted from: Postman.pdf*

---

# Postman

12 [th] March 2020 / Document No D20.100.60


Prepared By: MinatoTW


Machine Author(s): TheCyberGeek


Difficulty: Easy


Classification: Official


## **Synopsis**

Postman is an easy difficulty Linux machine, which features a Redis server running without

authentication. This service can be leveraged to write an SSH public key to the user's folder. An

encrypted SSH private key is found, which can be cracked to gain user access. The user is found

to have a login for an older version of Webmin. This is exploited through command injection to

gain root privileges.
### **Skills Required**


Enumeration
### **Skills Learned**


Redis Exploitation

Webmin Command Injection


## **Enumeration**

### **Nmap**





SSH and Apache are running on their usual ports. Additionally, a Redis 4.0.9 instance is also

found. Port 10000 hosts Webmin running on MiniServ 1.910 .
### **Redis**


Redis versions between 4.0 and 5.0 are vulnerable to unauthenticated command execution and

file writes. Detailed information on this vulnerability can be found in this [presentation. Let's](https://2018.zeronights.ru/wp-content/uploads/materials/15-redis-post-exploitation.pdf)

check if the server is vulnerable using redis-cli .


We were able to connect and query the configuration, which reveals that it's possible to operate

without authentication.


Looking at the config, we find the default folder to be /var/lib/redis . Let's check if the redis

user has SSH authentication configured by checking for the existence of .ssh folder.


In the image above, the server returned an error when we try setting a non-existent directory but

returned OK on setting dir to the .ssh folder. Having confirmed the existence of the .ssh

folder, we can proceed write our SSH public key to it. First, create a file named key.txt with the

SSH public key in it.


Next, set the file contents as a key in redis.

Save this key into the /var/lib/redis/.ssh/authorized_keys file.

In the image above, the key named ssh_key is saved into the authorized_keys file. We can now

SSH into the server as the redis user.


## **Lateral Movement**

The [LinPeas](https://github.com/carlospolop/privilege-escalation-awesome-scripts-suite/blob/master/linPEAS/linpeas.sh) enumeration script can be used to enumerate the box further. Download the script

and transfer it to the box using scp .

Browse to the /tmp folder and execute the script.

The script identified an id_rsa.bak file in the /opt folder.


The key is found to be encrypted. Copy the key locally, so we can attempt to crack it offline using

John the Ripper. The ssh2john script can be used to generate a hash of the key.


The offline brute force attack was successful, and the password is revealed to be computer2008 .

The other user on the box with valid shell is Matt . Trying to use this SSH key to login fails.

However, we can use su to switch user.


## **Privilege Escalation**

Enumeration as this user doesn't yield any interesting output. Let's try logging in to webmin with

his credentials.


The login was successful, giving us low privileged access to the application. The version of the

webmin server can be found by looking at the /etc/webmin/version file.


Searching for vulnerabilities in this version, we come across this [PoC. The package updater is](https://github.com/Dog9w23/Webmin-1.910-Exploit)

vulnerable to command injection through the u POST parameter. Click on System on the panel

to the left, then click on Software Package Updates . Turn on Burp intercept and click on Update

Select Packages .

A request to /package-updates/update.cgi should be intercepted, send this to Burp Repeater

and remove all the parameters. Add the following payload to the end of the request:





This should execute whoami before the apt update command. Once the page returns, scroll to

the bottom to look at the output.


It's seen that the server tried to install a package named root, which was the output of whoami .

Similarly, a bash reverse shell can be executed.


The final payload will be:


The IFS variable is used instead of spaces, in order to avoid the server from splitting the

command. Add this to the u parameter and URL encode it. Next, start a listener on port 4444

and forward the request.


A shell as root should be received.



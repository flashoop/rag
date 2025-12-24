# Registry

*Converted from: Registry.pdf*

---

# Registry

24 [th] March 2020 / Document No D20.200.67


Prepared By: MrR3boot


Machine Author(s): thek


Difficulty: Hard


Classification: Official


## **Synopsis**

Registry is a hard difficulty Linux machine, which features Docker and the Bolt CMS running on

Nginx. Docker registry API access is configured with default credentials, which allows us to pull

the repository files. Using the disclosed information it is possible to obtain an initial foothold.

User credentials for Bolt CMS can be obtained, and exploiting the CMS provides us with access to

the www-data user, who has a sudo entry to perform backups as root using the restic program.

After taking a backup of the root folder remotely and mounting the repository with restic, the

root flag is obtained.
### **Skills Required**


Enumeration

Port Forwarding
### **Skills Learned**


Docker API

Web Exploitation

Restic Exploitation


## **Enumeration**

#### **Nmap**





SSH and Nginx are running on ports 22, 80 and 443 respectively. Nmap also reveals the Common

Name docker.registry.htb from the SSL certificate.

#### **Nginx**


On browsing to ports 80 and 443 in a browser, we see default Nginx page.


We can add docker.registry.htb to our /etc/hosts and browse to it, which just shows an

empty page.

We can attempt to fuzz the files and directories using ffuf .


Accessing /v2 endpoint prompts for basic authentication.


We can try logging in using common usernames such as **administrator** or **admin** and passwords

such as **password** and **admin** . The credentials admin : admin are successful, and we gain

access to the API.

The Docker v2 API [docs](https://docs.docker.com/registry/spec/api/#listing-repositories) state that we can list repositories using /v2/_catalog . This finds the

bolt-image repository.


Every repository contains different versions, which we can obtain using /v2/bolt
image/tags/list .

We can view the manifest of latest version of the bolt-image repository to learn information

about the image, such as layers, size and digest.


## **Foothold**

We can download blobs from /v2/bolt-image/blogs/sha256: endpoint.



After running the command we see that a list of files have been downloaded.


After extracting the files, we see that the blob

2931a8b44e495489fdbe2bccd7232e99b182034206067a364553841a1f06f791 contains interesting

information. Inside it we have the root folder, and a .viminfo file is present.


Looking at the .viminfo file, we see the SSH password GkOcz221Ftb3ugog exposed on the

command line.


We also find SSH keys inside the .ssh folder. The public key reveals the username bolt .


We can now gain access to the server as bolt user using their private key and passphrase.


## **Lateral Movement**

Looking at /var/www/html/, we can see there's an application called bolt running on the

server, and backup.php reveals the domain name backup.registry.htb .


We can login to bolt by accessing /bolt/bolt/ .


Let's download the database file /var/www/html/bolt/app/database/bolt.db and examine in

locally. Using scp we can download the file to our machine.





We can obtain admin user's password hash from bolt_users table.


Using john we can crack the hash

We can login to the bolt application with the credentials admin : strawberry .

Under Configuration > Main Configuration we can see what file types are allowed to be

uploaded.


Edit config.yml to allow the php extension, and click Save.

We can proceed to upload a webshell with the contents below using the File Manager .





Navigating to shell.php gives us command execution in the context of www-data.


As outbound connections are blocked, we can stand up a listener in an SSH session, and upgrade

to a shell.




## **Privilege Escalation**

Running [linpeas](https://raw.githubusercontent.com/carlospolop/privilege-escalation-awesome-scripts-suite/master/linPEAS/linpeas.sh) reveals an interesting sudo entry


Restic is a backup program. From sudo entry we can see that www-data is permitted to run this

program as root, in order to backup data to a remote server via rest.


Exploiting of this requires setup of a rest-server, which can be done as follows.



After setting password for user we can initialise a new repository for backup


We can do a remote port forward in order to make rest server available from Registry.





Now we can perform a backup of root folder to the remote server under our control.


We can access root folder contents after mounting the backup



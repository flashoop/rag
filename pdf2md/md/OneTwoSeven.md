# OneTwoSeven

*Converted from: OneTwoSeven.pdf*

---

# OneTwoSeven
## **13 [th] November 2019 / Document No D19.100.35**

**Prepared By: MinatoTW**

**Machine Author: jkr**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 19


## **SYNOPSIS**

OneTwoSeven is a hard difficulty Linux box which provides users with SFTP access. The SFTP

shell allows for creating symlinks, which can be abused to gain access to the administrative

panel. The admin panel has a restricted upload imposed by Apache rewrite rules. These can be

bypassed to upload a php shell. The www user has permissions to upgrade local packages, but

due to a misconfiguration, a proxy server can be used to install a malicious package to execute

code as root.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - Apache rules

  - Abusing apt package manager


Page 2 / 19


## **ENUMERATION** **NMAP**





We find SSH and HTTP open and a filtered port 60080 which could be open on localhost.

## **HTTP**


Browsing to port 80 we find a webpage which provides static file hosting on the web server.


Page 3 / 19


Checking the source code we see that there’s a disabled link to the admin page on port 60080

which is accessible only for localhost users.


This should be useful later. Going back and enumerating we find the option to Sign up.


Clicking on the sign up takes us to another page which provides us with credentials to access

SFTP and a home page on the web server.

## **SFTP**


Let’s login to SFTP with the provided credentials.





After logging in we find an empty folder which is hosted on the web server.



Page 4 / 19


Looking at the help menu on SFTP we find an interesting command symlink. Maybe we can
symlink the root directory? Lets try that.





Now we can browse to the home folder on the web server which was provided during sign-up i.e

http://onetwoseven.htb/~ots-lMmVkNzA/root . We see some folders from the server’s root.


Let’s look into the html folder for source code of the web pages. Browsing to /var/www we find

two folders.


Looking into the html-admin folder we find a .login.php.swp file which is a vim swap file to help

with recovery of files. Let’s download the file using wget.





Page 5 / 19


​ ​



Once downloaded, create a file called login.php and open in vim, which will find the swap file and

ask for recovery.


​ ​



​ ​



​ ​



On the Attention screen hit on R to recover the file.


And the source code should appear.


Scrolling to the bottom we find a sha256 hash which is the password for the admin user.


Looking it up on [HashKiller​](https://hashkiller.co.uk/Cracker/MD5) it is cracked as Homesweethome1. ​


Page 6 / 19



​ ​



​ ​



​ ​



​ ​


Now that we have the password we need a way to access the admin panel. This can be achieved
by using SSH port forwarding. The -N flag should be specified to prevent errors. From the
manpage,


Lets forward port 60080 now,





Browsing to localhost:60080 we should now see the admin login.


Use the credentials ots-admin/Homesweethome1 to login.


We find various addons, for which one supplies the default login credentials.



Page 7 / 19


Logging into SFTP with these credentials gives the user flag.

## ALTERNATE WAY


We can abuse symlinks to view the source code of php files too. By named the files as .txt or

some other extension we can avoid execution of php code. Lets view the source of signup.php.





And now browsing to http://onetwoseven.htb/~ots-lMmVkNzA/signup.txt we should see the
source code.


Among other things we see the logic for user creation.


We can leverage this to gain the credentials of the 127.0.0.1 user. Create a php file with contents.





And executing it gives the credentials which can be used to gain the flag.



Page 8 / 19


​


## **FOOTHOLD**

We find an upload feature in the admin page. But the button is disabled.


The page even allows download of the addons using the DL button beside it. Let's view the OTS

Manager addon.


It says we can’t directly upload the addons by accessing the addon-upload.php page directly.

The rewrite rule matches the URI "addon-upload.php" or "addon-download.php" and replaces it

with "addons/ots-man-addon.php". The [L] flag stands for [Last​](https://httpd.apache.org/docs/2.4/rewrite/flags.html#flag_l) which stops processing if the

particular pattern is matched.


Page 9 / 19



​



​


We can download the manager addon using the download button beside it. Looking at the

source we see that if the request URI matches /addon-upload.php the file gets uploaded.


We can take advantage of this and bypass the ReWriteRule with something like,





Due to the rewrite addon-download.php is changed to addons/ots-man-addon.php by Apache
after which the ots-man-addon matches addon-upload.php in the URI and allows us to upload the
shell. Next go to the page, and click Inspect Element on the submit query button.


Remove the disabled attribute and then upload the shell.php file and intercept the request using
burp. The shell contains simple code like





Page 10 / 19


## **GETTING A SHELL**

In the request replace /addon-upload.php with /addon-download.php&/addon-upload.php and

then forward the request.


We get a “File uploaded successfully” message and now our shell should be in the addons folder.





And we’re able to execute commands now. Let’s execute a bash reverse shell.





Page 11 / 19


Executing the curl command gives us a shell as www-admin-data.



Page 12 / 19


## **PRIVILEGE ESCALATION** **ENUMERATION**

Looking at the sudo privileges we see that we can execute apt update and apt upgrade.


Let’s look at the configuration files for apt at /etc/apt/. In the sources.list.d directory we see an

unusual source onetwoseven.list.


It points towards packages.onetwoseven.htb which means that the apt manager will use it as a

package repository. Looking back at the sudo configurations we see that http_proxy environment

variable is kept while executing the command as root. We can abuse this by setting up a proxy

server and forcing the package manager to use our repository.


Page 13 / 19


We’ll run a simple proxy server locally using twisted. This will ensure that requests to our IP

address get redirected to packages.onetwoseven.htb.





Here’s the source for the server.





And in another terminal run simple http server on port 80. Edit your hosts file to point

packages.onetwoseven.htb to localhost.


Now when the proxy requests for packages.onetwoseven.htb it’ll be redirected to our localhost

server. Let’s see if we are able to proxy the requests.





Page 14 / 19


​ ​


​ ​



​ ​


​ ​



We see that it’s requesting the packages. Looking at our HTTP server we see that we received

the requests.


[We see it requesting for Release files and Packages.* files. According to the docs​](https://wiki.debian.org/DebianRepository/Format#A.22Release.22_files) ​ these files are

indices which are used to control the versions and prevent duplicate files. The Release files

needs to be accompanied by a gpg key, so we’ll ignore it for now. Let’s look at an example

Packages.gz file which the server was requesting such as [this​](http://de.deb.devuan.org/devuan/dists/ascii/main/binary-all/Packages.gz) .​


Download the file locally to inspect it.



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


Looking at the Packages file we see that it contains metadata about many packages, for example,



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


Page 15 / 19


The apt package manager downloads this file, compares the version of the software on file and

downloads it if it’s greater than the local copy. For example, in the above snippet the version for

bash_completion is 1:2.1-4, if this is greater than the local installed copy, then it’s is marked for

upgrade by apt.

## **SETTING UP REPOSITORY**


Let’s create our own Packages.gz file with metadata about our malicious deb package. Before

that we’ll need to create a malicious package. Let’s target a package which is already present on

the box such as wget. To create a minimal package follow these steps.





Page 16 / 19


This will create the control file with the metadata. Next make a dummy binary.





And now the important postinst script which will execute our reverse shell command.





Now package it using,





Warning: Do Not test this package on your host, try it in a VM as it may cause problems.


Now let’s create a file named "Packages" with the contents,





Page 17 / 19


The md5, sha1 and sha256 hashes are important and can be gained by using,





The size can be gained by simply doing an "ls -la". The filename attribute contains the full path to

the deb package which here is pwn/wget.deb. Finish the setup by using gzip and placing it the

right folder.





Now we run apt update and upgrade which would pull our package and execute the shell.





While updating we see that our Packages file was downloaded. Let’s run apt-get upgrade now.


Hit [y] when asked for permission.


Page 18 / 19


The box should pull the package from our server and install it, giving us a shell.


And we have a root shell!



Page 19 / 19



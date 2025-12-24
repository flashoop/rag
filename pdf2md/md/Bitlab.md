# Bitlab

*Converted from: Bitlab.pdf*

---

# Bitlab

8 [th] January 2019 / Document No D19.100.55


Prepared By: MinatoTW


Machine Author(s): Thek & Frey


Difficulty: Medium


Classification: Official


## **Synopsis**

Bitlab is a medium difficulty Linux machine running a Gitlab server. The website is found to

contain a bookmark, which can autofill credentials for the Gitlab login. After logging in, the user's

developer access can be used to write to a repository and deploy a backdoor with the help of git

hooks. The PostgreSQL server running locally is found to contain the user's password, which is

used to gain SSH access. The user's home folder contains Windows binary, which is analyzed to

obtain the root password.
### **Skills Required**


Enumeration

Reversing

Git
### **Skills Learned**


Web Hooks

Git Hooks

Dynamic Binary Analysis


## **Enumeration**

### **Nmap**



SSH and Nginx are found to be running on their common ports. Nmap returned some entries

from the robots.txt file, let's look at these.
### **Nginx**


Browsing to the web root, a login page for the Gitlab is returned.


The robots.txt file contains disallowed entries as per the Gitlab configuration.


#### **Gobuster**

Let's use gobuster to discover any other hidden directories. The gitlab server will redirect us to

the login page on any attempt, which is why we'll only look for 200 response code.

The -f flag appends / to each request. It was able to find the folders help, profile, search and

public. Browsing to the /profile folder we see a profile page for Clave.

Navigating to the /help folder returns a directory listing with an HTML page.


The HTML page contains some bookmarks pointing to standard URLs, but a bookmark named

"Gitlab Login" is found to contain JavaScript code. Right click on the link and select Inspect

Element to view it in the inspector.

Double click on the content present in the href attribute and copy it.



The snipped creates a JavaScript function and calls it. It contains a hex encoded array. Paste this

array into the browser console to view it as a string.


It then references these elements and assigns values.


The code sets the value for user_login field to clave and the user_password field to

11des0081x . Going back to the Gitlab login page and looking at the HTML source, it can be

verified that the id for username and password are user_login and user_password

respectively.

### **Gitlab**


This bookmark can be imported directly or we can execute this code in the console directly, which

should populate the username and password for us.


Clicking on Sign in should log us in.


Note: The login might fail on some versions of Firefox, in which case Chrome can be used instead.


We see two repositories owned by the Administrator, and enumeration of the website reveals a

snippet as well.


It seems to be a connection script for PostgreSQL. Let's save this and look at the repositories.


The profile repository is found to contain a single PHP page along with an image.

Looking at the index.php source code, we see the same name and description found during

enumeration of the /profile folder.


It's likely that the website hosts the file from this repository. Looking at the project members, it's

found that the user Clave has Developer access to it, which will let us commit files and merge

branches.


Let's move on the next repository named deployer . The repository contains a single index.php

file which is simulating a webhook. A webhook is used to perform certain actions based on user

interaction with the repository.


Looking at the source code, the page takes in JSON input and reads properties from it. When a

merge request is made, the code goes into the profile folder and executes git pull, which will

automatically merge changes from the branch into profile.


Let's verify this by creating a new branch and editing the index.php file in the profile repository.

Click on the + symbol near the name and select new branch.

Name it something and then proceed to edit the index.php file. We can add a comment at the

end and then commit the changes.


Next, click on Create merge request followed by Submit merge request to open a merge

request.

Once the merge request is open, click on the Merge button to merge changes.


Navigating to the profile page and viewing the source, the HTML comment should be seen at the

end.


## **Foothold**

Having confirmed our code injection, we can now add a backdoor PHP shell to the /profile

folder. Download the PHP the shell from [here](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php) and edit the IP address and port to reflect yours,

then click on + followed by Upload file .


Upload the reverse shell and then click on upload. Next, follow the same process as earlier to

merge changes. After the merge completes, the shell can be executed by browsing to

http://10.10.10.114/profile/shell.php .


## **Lateral Movement**

A TTY shell can be spawned using python.


Looking at the ports open locally, we find port 5432 to be open.


This is the default port for PostgreSQL server, which can be confirmed by looking at the running

processes. We already have potential credentials for the database from the snippet found earlier.

Let's try logging into the database and looking for information. Since the postgres server is

running within a docker, we won't have access to the client binaries. Instead, we can use the PHP

script and query the DB. Create a file named pg.php with the following contents:



The script fetches data from the profiles table and prints the results using the pg_fetch_all()

function. Transfer this script and then execute it on the box.


The query returned the password for clave, which can be used to SSH into the box.


## **Privilege Escalation**

A file named RemoteConnection.exe is noticed in her home folder. Let's transfer this using scp

and perform analysis.


Open it up in Ghidra and then go to Window > Defined Strings on the menu bar. Looking at the

defined strings, we see the username clave as well as a path to putty.exe.


Highlighting clave should make the Listing window jump to it's address. Right-click on it > Show

References and select Show References to this address. Double click on the address in the popup

Window, which should take us to the code where it's referenced. Looking at the code, we see that

it gets the current user's username using the GetUsername() function:


Then further on, this username is compared to "clave" which leads to execution of putty.exe

using the ShellExecuteW() function.


Looking at the [documentation](https://docs.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shellexecutew) of this function, it's found that the fourth parameter i.e.

lpParameters points to the string with the arguments to be passed to the process. This means

that the user's password should be present in this buffer. Let's use a debugger like [x32dbg](https://x64dbg.com/#start) to

reveal this string.


After loading the binary, right click in the disassembly region > search for > All Modules > String

references. This will list all the strings referenced in the binary.

Double click on clave to jump it's disassembly location.


In order to get to the ShellExecuteW() function, we'll have to bypass the username check. This

can be done by patching the jne instruction to je, which will pass the check irrespective of our

username. Double-click on the instruction line and change jne to je .

Click on OK and then close the popup to avoid changing the next instruction. Next, select the

line with the call to ShellExecuteW and hit F2 to add a breakpoint.


Now hit F9 twice to run the binary until the breakpoint is hit. Once the execution halts, the

window at the bottom right can be viewed to see the arguments pushed to the stack.


The password can be seen in plaintext at the fourth offset on the stack which is the pointer for

lpParameters. The credentials root / Qf7]8YSV.wDNF*[7d?j&eD4^ can be used login as root

and read the flag.

### **Alternate method**


Going back to the shell as www-data, we can enumerate his sudo privileges.


The user can executed git pull anywhere as root. Probably this was configured to allow

merging changes using the webhooks. This will let us leverage local git hooks and execute scripts

as root. Similar to webhooks, local git hooks execute certain commands based on the action

taken by the user. These hooks are present in the .git/hooks folder for any given repository. A

more detailed explanation can be found [here. According to the](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) [documentation, a post-merge](https://git-scm.com/docs/githooks#_post_merge)

hook is executed whenever a git pull command is issued.


Let's try executing a reverse shell through this hook. First, copy the profile repository from

Next, create a file named post-merge with the following contents:


In order to successfully merge, we'll have to make changes to the original repository. Login to the

gitlab project and commit an extra file to the profile repository, then merge the new branch to

the master branch. Now go back to the main folder and start a listener on port 5555. Then issue

the sudo git pull command to execute the post-merge script.


A shell as root should be received on the listener.



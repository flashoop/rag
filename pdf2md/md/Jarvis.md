# Jarvis

*Converted from: Jarvis.pdf*

---

# Jarvis
## **09 [th] September 2019 / Document No D19.100.44**

**Prepared By: MinatoTW**

**Machine Author: manulqwerty & Ghostpp7**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 16


## **SYNOPSIS**

Jarvis is a medium difficulty Linux box running a web server, which has DoS and brute force

protection enabled. A page is found to be vulnerable to SQL injection, which requires manual

exploitation. This service allows the writing of a shell to the web root for the foothold. The www

user is allowed to execute a script as another user, and the script is vulnerable to command

injection. On further enumeration, systemctl is found to have the SUID bit set, which is leveraged

to gain a root shell.


## **Skills Required**


  - SQL injection

  - Linux Enumeration

  - Command injection


## **Skills Learned**


  - File writes through SQL injection

  - Exploiting systemctl GTFObin


Page 2 / 16


## **ENUMERATION** **NMAP**





We see SSH and HTTP running on their default ports. Additionally, there’s an HTTP server
running on port 64999.


Page 3 / 16


## **APACHE**

Navigating to the Apache server on port 80 we come across a page titled “Stark Hotel”.


The page displays a vhost “supersecurehotel.htb”, which is added to the hosts file. Running

gobuster on the server results in the following message:


This makes it hard to perform any kind of scanning on the server. Browsing to port 64999 we see

the same message. Clicking on the “Rooms” tab on the page takes us to /room-suites.php.


Page 4 / 16


Clicking on the “Book now!” button opens up a new URL with a query named “cod”.





The page displays a particular room based on the value of the parameter.



Page 5 / 16


Let’s try to test parameter for SQL injection. Adding a quote and comment to the value results in

an empty response.


However, on removing the quote and retrying, the room image is returned. We can infer from this

that the server expects an integer for the parameter, and that it is SQL injectable.


Page 6 / 16


This can be verified by using a true and false clause. For example:





The above URL results in a true and true clause resulting in a true result overall and the room is

returned. But if we use a true and false clause like:





This results in a false value which fails to return the room.

## **SQL Injection**


Now that we have confirmed SQL injection, let’s try to extract information through a union based

SQL injection. We can use the “ORDER BY” keyword to find the number of columns.





The URL above returns the room which means the table has either 5 columns or more. On

incrementing the value by 1 each time, we find that no room is return for the value 8 which means

that the table has 7 columns.


Now we can use union based queries in order to find the injectable columns.





Page 7 / 16


We use the negative value to prevent the room being selected over our values. Trying the URL


We see the values 5, 2, 3 and 4 in the output which can be used for injection.

Let’s check the database version and the user we are running as.





The server is MariaDB, and we’re running as the DBadmin user. Let’s check if we can read files

using the load_file() function.


Page 8 / 16


Let’s also check if we can write files to the server. We can inspect the apache configuration to

identify the path of the webroot. Ideally, the apache2 configuration is located at


The path is configured with the default path /var/www/html. In MySQL, we can write files using

the “INTO OUTFILE” keyword. Let’s try writing contents of passwd to a file in the web root.


Page 9 / 16


The above query writes the contents of passwd to a file named hacked.txt. After requesting the


Page 10 / 16


## **FOOTHOLD**

Next, let’s write a webshell.





After requesting the above URL, we can use the “exec” parameter to execute commands on the
server.


A bash reverse shell can be executed to gain a reverse shell.





Page 11 / 16


## **LATERAL MOVEMENT**

Looking at the sudo permissions for www-data, we see that it can execute simpler.py as the user

pepper.


Looking at the script, we see that it takes an IP address on using the -p argument, and then uses

the os.system() function to execute ping.











Page 12 / 16


​



A few characters (& ; - ` |) are blocked by the script, in order to prevent injection. But the

characters ‘$’, ‘(‘ and ‘)’ aren’t blocked. This will let us inject commands through bash command

substitution i.e “ **$(cmd)** ​ ”. Let’s check if it works using the script.


We see that the command was substituted by the username “pepper”, and ping tried resolving it

as a hostname. This means that the command execution was successful. We can use this to

execute a bash reverse shell, and gain a shell as pepper. As some special characters are

blocked, we’ll write the command to a script and execute it through the injection.


Page 13 / 16



​



​



​


​ ​


## **PRIVILEGE ESCALATION**

After executing the script, a shell as pepper is received.


After enumerating SUID files, we see systemctl which isn’t an SUID by default.


The systemctl command is used to manage services on a system running systemd. Usually, the

configuration files are located are /etc/system/systemd. However, as we’re not root, it’s not

possible to write a file to this folder. Instead, we can use the systemctl link command.


According to the manpage [here​](https://www.freedesktop.org/software/systemd/man/systemctl.html),​ the link command can be used to include a configuration file

that isn’t in the default search path. This will help us create a unit file at any location and link it,

which will let us start the service.


Page 14 / 16



​ ​



​ ​


​ ​



​ ​



​ ​



[Checking GTFObins​](https://gtfobins.github.io/gtfobins/systemctl/), we see how this can be leveraged to execute commands. ​


The commands above create a file named pwn.service with service of type “oneshot”. The

oneshot service waits until the initial command has executed, before declaring the service active.

The “ExecStart” parameter is used to specify the command which is to be executed on start.

Then the link command is used to link the service to systemd, and the start command is used to

execute the command.


Page 15 / 16



​ ​


The output of the “id” command is seen in the file /tmp/output, which confirms that it runs as root.

Similarly, we can create another service which executes a reverse shell for us.


The service executes the script shell.sh which was created earlier and gives a root shell.


Page 16 / 16



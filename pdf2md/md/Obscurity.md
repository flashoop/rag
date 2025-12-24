# Obscurity

*Converted from: Obscurity.pdf*

---

# Obscurity

4 [th] May 2020 / Document No D20.100.72


Prepared By: egre55


Machine Author(s): clubby789


Difficulty: Medium


Classification: Official


## **Synopsis**

Obscurity is medium difficulty Linux machine that features a custom web server. A code injection

vulnerability is exploited to gain an initial foothold as www-data . Weak folder permissions reveal a

custom cryptography algorithm, that has been used to encrypt the user's password. A known
plaintext attack reveals the encryption key, which is used to decrypt the password. This password

is used to move laterally to the user robert, who is allowed to run a faux terminal as root. This

can be used to escalate privileges to root via winning a race condition or by overwriting sudo

arguments.
### **Skills Required**


Basic Linux Enumeration
### **Skills Learned**


Source Code Review

Known-Plaintext Attack


## **Enumeration**



Nmap shows that SSH is available on its default port, as well as a web server called

BadHTTPServer on port 8080, serving a page titled Obscura . Inspection of this page in a browser

reveals a site for a security focused software company. Their suite of products include the

BadHTTPServer web server, an encryption algorithm and an SSH replacement.


A message on the website discloses the file name of the web server, and that it's in a secret

development directory.


The custom web server is definitely of interest. Let's use ffuf to fuzz for possible directories.



After downloading and extracting, ffuf is run with the dirb common.txt wordlist. As we're

including the filename and expect to get a HTTP 200 response, we can filter for using the -mc

flag.

ffuf finds the directory develop . Let's download SuperSecureServer.py (also included in

**Appendix A** ) and examine it locally.




## **Foothold**

The serveDoc function contains some comments. It seems the developer has unwittingly

introduced an injection vulnerability, as the user controlled URL is passed to exec .





Let's stand up the server locally and validate the vulnerability. First, let's create the file structure

expected by the web server.







Next, we need to edit the file to output the requested URL, and to configure a socket to listen on.







After starting the web server, we can experiment with different requests.





Also also seen in the code, the URL is contained with two single-quotes. As the os library is

already imported, so we can attempt to execute a system command.







However, if the single-quotes are unbalanced, this will result in an error. This is corrected and we

successfully validated the injection vulnerability, and achieved command execution.


Let's attempt to replicate this on the actual system. As we don't have access to the console, we

can attempt to send ourselves two ICMP requests.





We have successfully achieved command execution of the server. We can attempt to exfiltrate

basic output from the server over HTTP, by examining the requested URL in our web server logs.







Let's get a shell on the server using a Python one-liner.






Next, let's upgrade to a TTY shell.





There are many command-line scripts that we can use to do some heavy lifting of the initial

enumeration, such as [linPEAS.](https://github.com/carlospolop/privilege-escalation-awesome-scripts-suite/tree/master/linPEAS)



After running this, we see that the system user robert has a world-readable home directory

containing some interesting files.


## **Lateral Movement**

The file SuperSecureCrypt.py (also included in **Appendix B** ) contains functions to encrypt and

decrypt files. The key is used repeatedly until it matches the length of the plaintext, after which it

adds the

values together and outputs the result.





check.txt seems to be a test input file (plaintext) for the program, with out.txt being the

produced ciphertext. The developer seems to have used this program to encrypt their password,

stored as passwordreminder.txt .


Although we don't know the key that was used to create the ciphertext, we should be able to

derive it through a known plaintext attack, as we have both the plaintext ( check.txt ) and

corresponding ciphertext ( out.txt ).


Base64 encode the files on the remote system, and then recreate the files locally.







We can subtract the plaintext from the ciphertext in order to reveal the key.


This is successful, and the key alexandrovich is revealed. With the key in hand, let's download

passwordreminder.txt and decrypt it.







Running the script below reveals the password SecThruObsFTW, which we can use to su to

robert and gain the user flag.






getpass(cipher, "alexandrovich")


## **Privilege Escalation**

Checking for sudo entries reveals that robert is able to run the file

/home/robert/BetterSSH/BetterSSH.py (also included as **Appendix C** ) as root.

### **Method 1**


As seen in the code, when authenticating a user the script temporarily stores /etc/shadow

entries to a random filename under /tmp/SSH . It sleeps for one second before deleting it.



On running the file, it's found that /tmp/SSH doesn't exist, so we can create it.


First, start two separate SSH sessions as robert . Next, navigate to the SSH directory in one, and

start a loop to copy anything created in this directory to /tmp .



After executing BetterSSH.py in the other SSH session and authenticating successfully as

robert, we find the random file has been copied to /tmp, containing the /etc/passwd hashes

as expected.

We can use john to crack the hash, which reveals the password mercedes .

This can be used to su to root and gain the root flag.

### **Method 2**

Inspection of the code reveals that for every command executed, sudo -u as appended to it.







By specifying additional -u <user> options, we should be able to overwrite this initial

assignment. Indeed, replicating locally we confirm that this is the case.


Within the session, we can input -u root id and confirm command execution as root.


Let's create a reverse shell.





After executing this script in the BetterSSH.py session, we get a reverse shell as root.


## **Appendix**

### **Appendix A**

import socket


import threading


from datetime import datetime


import sys


import os


import mimetypes


import urllib.parse


import subprocess


respTemplate = """HTTP/1.1 {statusNum} {statusCode}


Date: {dateSent}


Server: {server}


Last-Modified: {modified}


Content-Length: {length}


Content-Type: {contentType}


Connection: {connectionType}


{body}


"""


DOC_ROOT = "DocRoot"


CODES = {"200": "OK",


"304": "NOT MODIFIED",


"400": "BAD REQUEST", "401": "UNAUTHORIZED", "403": "FORBIDDEN", "404":


"NOT FOUND",


"500": "INTERNAL SERVER ERROR"}


MIMES = {"txt": "text/plain", "css":"text/css", "html":"text/html", "png":


"image/png", "jpg":"image/jpg",


"ttf":"application/octet-stream","otf":"application/octet-stream",


"woff":"font/woff", "woff2": "font/woff2",


"js":"application/javascript","gz":"application/zip", "py":"text/plain",


"map": "application/octet-stream"}


class Response:


def __init__(self, **kwargs):


self.__dict__.update(kwargs)


now = datetime.now()


self.dateSent = self.modified = now.strftime("%a, %d %b %Y %H:%M:%S")


def stringResponse(self):


return respTemplate.format(**self.__dict__)


class Request:


def __init__(self, request):


self.good = True


try:


request = self.parseRequest(request)


self.method = request["method"]


self.doc = request["doc"]


self.vers = request["vers"]


self.header = request["header"]


self.body = request["body"]


except:


self.good = False


def parseRequest(self, request):


req = request.strip("\r").split("\n")


method,doc,vers = req[0].split(" ")


header = req[1:-3]


body = req[-1]


headerDict = {}


for param in header:


pos = param.find(": ")


key, val = param[:pos], param[pos+2:]


headerDict.update({key: val})


return {"method": method, "doc": doc, "vers": vers, "header":


headerDict, "body": body}


class Server:


def __init__(self, host, port):


self.host = host


self.port = port


self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)


self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)


self.sock.bind((self.host, self.port))


def listen(self):


self.sock.listen(5)


while True:


client, address = self.sock.accept()


client.settimeout(60)


threading.Thread(target = self.listenToClient,args =


(client,address)).start()


def listenToClient(self, client, address):


size = 1024


while True:


try:


data = client.recv(size)


if data:


# Set the response to echo back the recieved data


req = Request(data.decode())


self.handleRequest(req, client, address)


client.shutdown()


client.close()


else:


raise error('Client disconnected')


except:


client.close()


return False


def handleRequest(self, request, conn, address):


if request.good:


#      try:


# print(str(request.method) + " " + str(request.doc), end=' ')


# print("from {0}".format(address[0]))


#      except Exception as e:


#        print(e)


document = self.serveDoc(request.doc, DOC_ROOT)


statusNum=document["status"]


else:


document = self.serveDoc("/errors/400.html", DOC_ROOT)


statusNum="400"


body = document["body"]


statusCode=CODES[statusNum]


dateSent = ""


server = "BadHTTPServer"


modified = ""


length = len(body)


contentType = document["mime"] # Try and identify MIME type from string


connectionType = "Closed"


resp = Response(


statusNum=statusNum, statusCode=statusCode,


dateSent = dateSent, server = server,


modified = modified, length = length,


contentType = contentType, connectionType = connectionType,


body = body


)


data = resp.stringResponse()


if not data:


return -1


conn.send(data.encode())


return 0


def serveDoc(self, path, docRoot):


path = urllib.parse.unquote(path)


try:


info = "output = 'Document: {}'" # Keep the output for later debug


exec(info.format(path)) # This is how you do string formatting,


right?


cwd = os.path.dirname(os.path.realpath(__file__))


docRoot = os.path.join(cwd, docRoot)


if path == "/":


path = "/index.html"


requested = os.path.join(docRoot, path[1:])


if os.path.isfile(requested):


mime = mimetypes.guess_type(requested)


mime = (mime if mime[0] != None else "text/html")


mime = MIMES[requested.split(".")[-1]]


try:


with open(requested, "r") as f:


data = f.read()


except:


with open(requested, "rb") as f:


data = f.read()


status = "200"


else:


errorPage = os.path.join(docRoot, "errors", "404.html")


mime = "text/html"


with open(errorPage, "r") as f:


data = f.read().format(path)


status = "404"


except Exception as e:


print(e)


errorPage = os.path.join(docRoot, "errors", "500.html")


mime = "text/html"


with open(errorPage, "r") as f:


data = f.read()


status = "500"


return {"body": data, "mime": mime, "status": status}


**SuperSecureServer.py**

### **Appendix B**


import sys


import argparse


def encrypt(text, key):


keylen = len(key)


keyPos = 0


encrypted = ""


for x in text:


keyChr = key[keyPos]


newChr = ord(x)


newChr = chr((newChr + ord(keyChr)) % 255)


encrypted += newChr


keyPos += 1


keyPos = keyPos % keylen


return encrypted


def decrypt(text, key):


keylen = len(key)


keyPos = 0


decrypted = ""


for x in text:


keyChr = key[keyPos]


newChr = ord(x)


newChr = chr((newChr      - ord(keyChr)) % 255)


decrypted += newChr


keyPos += 1


keyPos = keyPos % keylen


return decrypted


parser = argparse.ArgumentParser(description='Encrypt with 0bscura\'s encryption


algorithm')


parser.add_argument('-i',


metavar='InFile',


type=str,


help='The file to read',


required=False)


parser.add_argument('-o',


metavar='OutFile',


type=str,


help='Where to output the encrypted/decrypted file',


required=False)


parser.add_argument('-k',


metavar='Key',


type=str,


help='Key to use',


required=False)


parser.add_argument('-d', action='store_true', help='Decrypt mode')


args = parser.parse_args()


banner = "################################\n"


banner+= "#      BEGINNING     #\n"


banner+= "#  SUPER SECURE ENCRYPTOR  #\n"


banner+= "################################\n"


banner += " ############################\n"


banner += " #    FILE MODE     #\n"


banner += " ############################"


print(banner)


if args.o == None or args.k == None or args.i == None:


print("Missing args")


else:


if args.d:


print("Opening file {0}...".format(args.i))


with open(args.i, 'r', encoding='UTF-8') as f:


data = f.read()


print("Decrypting...")


decrypted = decrypt(data, args.k)


print("Writing to {0}...".format(args.o))


with open(args.o, 'w', encoding='UTF-8') as f:


f.write(decrypted)


else:


print("Opening file {0}...".format(args.i))


with open(args.i, 'r', encoding='UTF-8') as f:


data = f.read()


print("Encrypting...")


encrypted = encrypt(data, args.k)


print("Writing to {0}...".format(args.o))


with open(args.o, 'w', encoding='UTF-8') as f:


f.write(encrypted)


**SuperSecureCrypt.py**

### **Appendix C**


import sys


import random, string


import os


import time


import crypt


import traceback


import subprocess


path = ''.join(random.choices(string.ascii_letters + string.digits, k=8))


session = {"user": "", "authenticated": 0}


try:


session['user'] = input("Enter username: ")


passW = input("Enter password: ")


with open('/etc/shadow', 'r') as f:


data = f.readlines()


data = [(p.split(":") if "$" in p else None) for p in data]


passwords = []


for x in data:


if not x == None:


passwords.append(x)


passwordFile = '\n'.join(['\n'.join(p) for p in passwords])


with open('/tmp/SSH/'+path, 'w') as f:


f.write(passwordFile)


time.sleep(.1)


salt = ""


realPass = ""


for p in passwords:


if p[0] == session['user']:


salt, realPass = p[1].split('$')[2:]


break


if salt == "":


print("Invalid user")


os.remove('/tmp/SSH/'+path)


sys.exit(0)


salt = '$6$'+salt+'$'


realPass = salt + realPass


hash = crypt.crypt(passW, salt)


if hash == realPass:


print("Authed!")


session['authenticated'] = 1


else:


print("Incorrect pass")


os.remove('/tmp/SSH/'+path)


sys.exit(0)


os.remove(os.path.join('/tmp/SSH/',path))


except Exception as e:


traceback.print_exc()


sys.exit(0)


if session['authenticated'] == 1:


while True:


command = input(session['user'] + "@Obscure$ ")


cmd = ['sudo', '-u', session['user']]


cmd.extend(command.split(" "))


proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,


stderr=subprocess.PIPE)


o,e = proc.communicate()


print('Output: ' + o.decode('ascii'))


print('Error: ' + e.decode('ascii')) if len(e.decode('ascii')) > 0 else


print('')


**BetterSSH.py**



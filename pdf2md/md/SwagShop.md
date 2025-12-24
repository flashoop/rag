# SwagShop

*Converted from: SwagShop.pdf*

---

# SwagShop

17 [th] June 2019 / Document No D19.100.38


Prepared By: dotguy. MinatoTW


Machine Author(s): ch4p


Difficulty: Easy

## **Synopsis**


SwagShop is an easy-difficulty Linux box running an old version of Magento which is vulnerable to

SQLi and RCE vulnerabilities leading to a shell. The low-level user can run `vim` with 'sudo'

privileges, which can be abused to escalate privileges and obtain a root shell.
### **Skills required**


Basic Linux fundamentals
### **Skills learned**


Exploit modification


GTFO bins

## **Enumeration**


Let us run a Nmap scan to discover the open ports of the remote host.






Looking at the Nmap scan we have SSH and Apache running on their common ports.

### **HTTP**


Browsing to port 80, we see that we are being redirected to `swagshop.htb` . This means that the

server is using Virtual Host Routing.

Thus, let us add an entry for `swagshop.htb` in the `/etc/hosts` file with the corresponding IP

address to be able to access it in the browser.





Now, let us visit `swagshop.htb` in the browser.


This appears to be an e-commerce shopping website. We can also figure out from the logo at the

top of the page that this website is using the Magento framework at the backend.

[Let us make use of this Magento enumeration tool called "Magescan". We can download the](https://github.com/steverobbins/magescan) `phar`

file for the latest release from [here](https://github.com/steverobbins/magescan/releases/download/v1.12.9/magescan.phar) and then scan the box using it.



We can then run this tool with the following command:




The scan confirmed the Magento version as either `1.9.0.0` or `1.9.0.1` . Upon googling about this

version, we can see that this version was released in May 2014 which is pretty old. Thus, it is highly

likely this there are unpatched vulnerabilities present in this Magento version.


The scan also found a list of the following potentially sensitive files & directories were exposed to

us:



On visiting each of them, we find that `app/etc/local.xml` reveals the database credentials to us.


Upon searching for the list of [CVEs](https://www.cvedetails.com/vulnerability-list/vendor_id-15393/product_id-31613/Magento-Magento.html) we find one arbitrary SQL command execution vulnerability i.e

[CVE-2015-1397. The vulnerability was named "Magento Shoplift" which brings us to this page with](https://www.cvedetails.com/cve/CVE-2015-1397/)

[the PoC.](https://github.com/joren485/Magento-Shoplift-SQLI)

#### **SQL Injection**


Looking at the script we see it uses prepared statements to insert values in the admin tables.


It then injects it into the popularity parameter.


Download the PoC script from [here](https://raw.githubusercontent.com/joren485/Magento-Shoplift-SQLI/master/poc.py) and edit the username and password that you want to be set

for the admin user (we have set them as `superuser:123` for this writeup) and then run it.





Using the username & pasword that we set in the poc, we can log into the admin panel.


## **Foothold**

Searching on exploit-db for exploits related to Magento we come across [this. It’s an authenticated](https://www.exploit-db.com/exploits/37811)

RCE exploit. As we already have the credentials, we can try using it. The exploit doesn’t work out of

the box and it needs some changes. However, if we search a little more we find this [GitHub page,](https://github.com/Hackhoven/Magento-RCE)

which has a modified version of the original script compatible with `python3` . Let's use this script

instead but similarly to the original, we will have to change a few variables.


First we need to change the install date, username and password as specified by the author.



The date can be found in the `app/etc/local.xml` file from earlier. The new version of the script

appears to have the correct date and time, so we don't need to change this variable after all but

for verification purposes, let's double check.


Now let’s understand and replicate what the original script does. It first creates a mechanize

browser object and then logs the user in.


Let’s make that request and intercept it via `Burpsuite` using the credentials that we earlier used

for logging in as an admin user.


Send the request to the repeater and login.

It then finds the `ajaxBlockUrl` and `form_key` values.


Searching in the source of the dashboard page we see them.


After finding them it creates a URL by concatenating them.


In this case the URL would be:


And the POST data:


Let’s request the page now.


Looking at the response we don’t see any data.


This is because there are no orders placed and being shipped within the last 7 days. We can

change that by reordering and shipping one of the existing orders under the `Last 5 Orders` tab

on the left side of the dashboard.


First we'll hit the reorder button and submit.


Then after we have confirmation that the order has been created, we will click ship and submit

shipment.


We will see another confirmation that the shipment has been created and if we navigate back to

the `Dashboard` we should see that the quantity of orders has changed from `0` to `1` .


So now if we request the page again, we see that the response contains the tunnel link which the

exploit searches for.


Now for the next step the exploit creates the payload using serialized objects.


Copy the payload generation part from the script.




Running it will generate the payload to execute `whoami` .







Now copy the payload and the `gh` value and put it together with the tunnel URL, which will result

in code execution.


Sending the request leads to code execution.


Instead of manually creating the payload each time for each command we can simply use the

script we found on `Github` .

Running the exploit with `id` command to verify the proper working of the exploit:







Starting a listener port on our local host:





Now, let us run this exploit and obtain a reverse shell on our listening port using a reverse shell

bash command.





And after a few seconds we should get a response




There exists a user `haris` on the remote host. The user flag can be found at

`/home/haris/user.txt` .

## **Privilege Escalation**

Checking the sudo permissions for user `www-data` we see that this user can run `vim` as root.





Vim is a [GTFObin](https://gtfobins.github.io/gtfobins/vim/#sudo) which can be used to break out of restricted shells. Use the following command

to get a root shell.




The root flag can be found at `/root/root.txt` .



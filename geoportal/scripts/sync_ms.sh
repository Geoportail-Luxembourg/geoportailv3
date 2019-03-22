scp $1 user@host:/path
if [ "$2" = "remove" ]
then
  rm -f $1
fi
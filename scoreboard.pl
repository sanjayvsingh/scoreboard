#!/usr/bin/perl
#!c:/programs/perl/bin/perl.exe -w
use strict;
use CGI qw(:standard);
use Data::Dumper;

my $paramHash;
if ( $^O eq "MSWin32" ) {
	$paramHash = {
        "vName" => "vis",  "hName" => "hometeam",
		"vLine" => "0|1|2|3",
		"hLine" => "4|5",
		"vHits" => 1,   "vErrors" => 3,     "vKs" => 5, 
		"hHits" => 2,   "hErrors" => 4,     "hKs" => 6,
		"curOuts" => 1,	"curHalf" => "h",   "curInning" => 5,
    };
} else {
	# Unix - get params from args
	$paramHash = &cleanParams(qw(vName hName vLine hLine vHits hHits vErrors hErrors vKs hKs curHalf curInning curOuts));
}

# display the entry form or the scoreboard
if ( $$paramHash{"vName"} eq "" && $$paramHash{"hName"} eq "" ) {
	&printTeamForm();
} else {
	&printScoreboard($paramHash);
}

## end of programs/perl/bin/perl

# SUBROUTINES
sub printTeamForm {
	&printHeader();
	print qq(
		<form id="getNames" action="$ENV{'SCRIPT_NAME'}">
		<input name="vName" value="Visitor" onfocus="this.value=''"> <input name="hName" value="Home" onfocus="this.value=''"> <input type="Submit" value="Submit">
		</form>
	);
	&printFooter();
}

sub cleanParams {
	# gets a hash of expected parameters - if any are not defined, then return them as an empty string
	my @params = @_;

	my %cleanParams = {};
	foreach my $p (@params) {
		if ( defined param($p) ) {
			($cleanParams{$p}) = param($p) =~ /([\w\|]*)/;  # remove non-word or | characters - untainting
		} elsif ( $p =~ m|[vh].*s$| ) {
			# Hits, Errors, or Ks (looking for params ending with s
			$cleanParams{$p} = 0;
		} else {
			$cleanParams{$p} = "";
		}
	}
	# default values for state
	if ( $cleanParams{"curHalf"} eq "" ) { $cleanParams{"curHalf"} = "v"; }
	if ( $cleanParams{"curInning"} eq "" ) { $cleanParams{"curInning"} = 1; }
	if ( $cleanParams{"curOuts"} eq "" ) { $cleanParams{"curOuts"} = 0; }
	return \%cleanParams;
}

sub printScoreboard {
	my ($p) = @_;
	
	my $vRuns = 0;
	my @vLine = split(/\D+/, $$p{"vLine"});
	for (@vLine) { $vRuns += $_; }

	my $hRuns = 0;
	my @hLine = split(/\D+/, $$p{"hLine"});
	for (@hLine) { $hRuns += $_; }
	
	my $lastInning = 0;
	my $vInnings = scalar(@vLine);
	my $hInnings = scalar(@hLine);
	if ( $vInnings > $lastInning ) { $lastInning = $vInnings; }
	if ( $hInnings > $lastInning ) { $lastInning = $hInnings; }

	# extra innings
	my $maxInning = 9;
	# disabled until you figure out how to do this
	if ( 0 && $lastInning >= 9 && $vRuns == $hRuns && defined $hLine[$lastInning-1] ) {
		# $maxInning = (int($lastInning / 3) + 1 ) * 3;
		$maxInning = $lastInning + 1;
	}
	&printHeader();

	# headings
	print qq(<table class="scaledTable">\n);
	print qq(<tr height="50">\n);
	print qq( <th id="outs" class="outs">&EmptySmallSquare;&EmptySmallSquare;&EmptySmallSquare;</th><th>&nbsp;</th>\n);
	foreach my $i (1..$maxInning) {
		print qq(<th>$i</th>);
		if ( $i %3 == 0 ) { print qq(<th>&nbsp;</th>); }  # print a separator after every third inning
	} # foreach
	print qq(<th>&nbsp;</th><th>R</th><th>H</th><th>E</th><th>K</th>);
	print qq(</tr>\n);
	
	# visitor line
	print qq(<tr height="50">\n);
	print qq( <td id="vName" style='text-align: left;'>$$p{'vName'}</td><td>&nbsp;</td>\n);
	foreach my $i (1..$maxInning) {
		my $id = "v$i";
		my $iRuns = "";
		if ( defined $vLine[$i-1] ) { $iRuns = $vLine[$i-1]; }
		print qq( <td id="$id" onclick="chgInning(this.id)" class="val">$iRuns</td>\n);
		if ( $i %3 == 0 ) { print qq( <td>&nbsp;</td>\n); }  # print a separator after every third inning
	} # foreach
	print qq( <td>&nbsp;</td>);
	print qq( <td id="vRuns" class="val">$vRuns</td>);
	print qq( <td id="vHits" class="val">$$p{'vHits'}</td>);
	print qq( <td id="vErrors" class="val">$$p{'vErrors'}</td>);
	print qq( <td id="vKs" class="val">$$p{'vKs'}</td>);
	print qq(</tr>\n);

	# home line
	print qq(<tr height="50">\n);
	print qq( <td id="hName" style='text-align: left;'>$$p{'hName'}</td><td>&nbsp;</td>\n);
	foreach my $i (1..$maxInning) {
		my $id = "h$i";
		my $iRuns = "";
		if ( defined $hLine[$i-1] ) { $iRuns = $hLine[$i-1]; }
		print qq( <td id="$id" onclick="chgInning(this.id)" class="val">$iRuns</td>\n);
		if ( $i %3 == 0 ) { print qq( <td>&nbsp;</td>\n); }  # print a separator after every third inning
	} # foreach
	print qq( <td>&nbsp;</td>);
	print qq( <td id="hRuns" class="val">$hRuns</td>);
	print qq( <td id="hHits" class="val">$$p{'hHits'}</td>);
	print qq( <td id="hErrors" class="val">$$p{'hErrors'}</td>);
	print qq( <td id="hKs" class="val">$$p{'hKs'}</td>);
	print qq(</tr>\n);
	print qq(</table>\n);
	
	&printWidget();
	&printScoreForm($p);
	&printFooter();	
}

sub printWidget {
	print <<EOW;
<table><tr>
	<td class="widget" onclick="chgOuts(-1)">-</td>
	<td class="widgetlbl">Outs</td>
	<td class="widget" onclick="chgOuts(1)">+</td>

	<td>&nbsp;&nbsp;</td>
	<td class="widget" onclick="chgRuns(-1)">-</td>
	<td class="widgetlbl">Runs</td>
	<td class="widget" onclick="chgRuns(1)">+</td>

	<td>&nbsp;&nbsp;</td>
	<td class="widget" onclick="chgHits(-1)">-</td>
	<td class="widgetlbl">Hits</td>
	<td class="widget" onclick="chgHits(1)">+</td>

	<td>&nbsp;&nbsp;</td>
	<td class="widget" onclick="chgErrors(-1)">-</td>
	<td class="widgetlbl">Errors</td>
	<td class="widget" onclick="chgErrors(1)">+</td>

	<td>&nbsp;&nbsp;</td>
	<td class="widget" onclick="chgKs(-1)">-</td>
	<td class="widgetlbl">Ks</td>
	<td class="widget" onclick="chgKs(1)">+</td>
<tr></table>
EOW
}

sub printScoreForm {
	my ($p) = @_;
	print qq(<form id="scoreboard" action="$ENV{'SCRIPT_NAME'}">);
	foreach my $i (keys %$p) {
		unless ( !defined $$p{$i} ) {
			# we're getting a HASH value in $p, need to investigate why
			print qq( <input type="hidden" name="$i" value="$$p{$i}">\n);
		}
	}
	print qq(</form>);
}

sub printHeader {
	print header;
	print <<EOH;
	<html>
	<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
	<title>Scoreboard</title>
	<link href='https://fonts.googleapis.com/css?family=Rubik Mono One' rel='stylesheet'>
	<link rel="stylesheet" type="text/css" href="http://sanvash.com/tts/scoreboard.css">
	<script src="http://sanvash.com/tts/scoreboard.js"></script>
	<!-- Global site tag (gtag.js) - Google Analytics -->
	<script async src="https://www.googletagmanager.com/gtag/js?id=UA-25509053-5"></script>
	<script>
	  window.dataLayer = window.dataLayer || [];
	  function gtag(){dataLayer.push(arguments);}
	  gtag('js', new Date());

	  gtag('config', 'UA-25509053-5');
	</script>
	
</head>
<body><div class="scaledPage">
EOH
}

sub printFooter {
	print "</div></body></html>\n";
}

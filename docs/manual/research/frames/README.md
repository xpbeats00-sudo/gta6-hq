# Frame evidence from Rockstar's Extended Look

Source: Rockstar's official download, `GTAVI_An_Extended_Look.mp4`, linked from https://www.rockstargames.com/VI/media/videos (3840×2160, 26:48, 14.1 GB). The file was not downloaded whole: single frames were read from Rockstar's server at chosen times with `ffmpeg -ss <seconds>`.

| Sheet | Contents | Reading order |
|---|---|---|
| `scan-every-4s_600-1140s.jpg` | Top-right corner of the screen every 4 s from 10:00 to 19:00 | 8 per row, left to right; frame *i* is at 600 + 4·*i* seconds |
| `hud-sheet-A_696-912s.jpg` | Full-resolution top-right crops | 4 per row: 696, 699, 702, 705 / 708, 711, 714, 717 / 720, 840, 844, 848 / 852, 856, 860, 864 / 868, 872, 876, 912 |
| `hud-sheet-B_912-977s.jpg` | Same | 912, 916, 920, 924 / 928, 932, 936, 940 / 944, 948, 950, 953 / 956, 959, 962, 965 / 968, 971, 974, 977 |
| `hud-sheet-C_980-1116s.jpg` | Same | 980, 983, 986, 989 / 992, 995, 998, 1092 / 1095, 1098, 1101, 1104 / 1107, 1110, 1113, 1116 |
| `hud-sheet-D_…jpg` | Same | 1078 to 1094 one per second (17 frames), then 722, 726, 730, 1120, 1124 |
| `context_…jpg` | Whole frames | 4 per row at the seconds named in the file name |

Times are seconds from the start of the file. They are approximate to within a second or so.

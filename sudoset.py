import sys, termios, tty, os, time

def Showboard(sudo, quiz = None):

    start = 0
    end = 9
    print("┏━━━┯━━━┯━━━┳━━━┯━━━┯━━━┳━━━┯━━━┯━━━┓")
    for k in range(9):
        count = 0
        for j in sudo[start:end]:
            count += 1
            if count == 1 or count == 4 or count == 7:
                print("┃ ", end = '')
            else:
                print("│ ", end = '')
            if j == 0:
                print("  ", end = '')
            else:
                if quiz != None:
                    temp = quiz[start:end]
                    if temp[count-1] == 1:
                        print("\u001b[32;1m%d\u001b[0m " % j, end = '')
                        sys.stdout.flush()
                    else:
                        print("%d " % j, end = '')
                else:
                    print("%d " % j, end = '')
        print("┃")
        if k == 2 or k == 5:
            print("┣━━━┿━━━┿━━━╋━━━┿━━━┿━━━╋━━━┿━━━┿━━━┫")
        elif k == 8:
            pass
        else:
            print("┠───┼───┼───╂───┼───┼───╂───┼───┼───┨")
        start += 9
        end += 9
    print("┗━━━┷━━━┷━━━┻━━━┷━━━┷━━━┻━━━┷━━━┷━━━┛")


def Getcandid(sudo, count):

    def getArowlist(sudo, head):
    
        R = []
        for i in range(head*9, head*9+9):
            if sudo[i] != 0:
                R += [sudo[i]]
        return R
    
    
    def getAcollist(sudo, head):
    
        C = []
        for i in range(head, head+73, 9):
            if sudo[i] != 0:
                C += [sudo[i]]
        return C
    
    
    def getAsquarelist(sudo, member):
    
        R = member // 27
        C = (member % 9) // 3
        K = R * 27 + C *3
        return [sudo[K], sudo[K+1], sudo[K+2],\
                sudo[K+9], sudo[K+10], sudo[K+11],\
                sudo[K+18], sudo[K+19], sudo[K+20]]
    
    
    candid = []
    if sudo[count] != 0:
        return []
    row = getArowlist(sudo, count // 9)
    col = getAcollist(sudo, count % 9)
    square = getAsquarelist(sudo, count)
    for j in range(1, 10):
        if j not in row and j not in col and j not in square:
            candid.append(j)
    return candid


def Initial(sudo, quizlist):

    def Move(pos):

        print("\u001b[%d;%dH" % (pos[1], pos[0]), end = '')
        sys.stdout.flush()
    
    
    def ClearRow(pos):

        print("\u001b[%d;%dH\u001b[K" % (pos[1], pos[0]), end = '')
        sys.stdout.flush()
    
    
    def MarkYL(pos, num):

        print("\u001b[%d;%dH\u001b[43;1m%d\u001b[0m" % (pos[1], pos[0], num), end = '')
        sys.stdout.flush()
    
    
    def MarkGR(pos, num):

        print("\u001b[%d;%dH\u001b[42;1m%d\u001b[0m" % (pos[1], pos[0], num), end = '')
        sys.stdout.flush()
    
    
    def MarkRD(pos, num):

        print("\u001b[%d;%dH\u001b[41;1m%d\u001b[0m" % (pos[1], pos[0], num), end = '')
        sys.stdout.flush()
    
    
    def Getxy(num):
    
        return ((35-(8-(num % 9))*4), ((num // 9)+1)*2)
    
    
    def Enter(sudo, index):
    
        mysettings = termios.tcgetattr(sys.stdin)
        tty.setraw(sys.stdin)
        
        while True:
            if index > 80:
                index -= 81;
            if index < 0:
                index += 81;
            Move(Getxy(index))
            key = sys.stdin.readline(1)
            if ord(key) == 3:
                Move((0, 20))
                print("Program ends")
                print("\u001b[1000D")
                sys.stdout.flush()
                termios.tcsetattr(sys.stdin, termios.TCSADRAIN, mysettings)
                exit(1)
            if ord(key) == 13:
                break;
            if ord(key) == 27:
                key = sys.stdin.readline(1)
                if ord(key) == 91:
                    key = sys.stdin.readline(1)
                    if ord(key) == 65:
                        index -= 9
                    if ord(key) == 66:
                        index += 9
                    if ord(key) == 67:
                        index += 1
                    if ord(key) == 68:
                        index -= 1
            elif ord(key) <= 57 and ord(key) >= 49:
                sudo[index] = int(key)
                print(int(key), end = '')
                sys.stdout.flush()
            elif ord(key) == 32:
                sudo[index] = 0
                print(' ', end = '')
                sys.stdout.flush()
            sys.stdin.flush()
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, mysettings)
    
    
    def Check(sudo):
    
        def checkrowlist(sudo):
        
            for head in range(0, 73, 9):
                R = []
                for travel in range(head, head+9):
                    R += [sudo[travel]]
                for num in range(1, 10):
                    if R.count(num) > 1:
                        MarkGR(Getxy(head+R.index(num)), num)
                        R[R.index(num)] = 0
                        MarkGR(Getxy(head+R.index(num)), num)
                        R[R.index(num)] = 0
                        return False
            return True
        
        
        def checkcollist(sudo):
        
            for head in range(9):
                C = []
                for travel in range(head, head+73, 9):
                    C += [sudo[travel]]
                for num in range(1, 10):
                    if C.count(num) > 1:
                        MarkRD(Getxy(head+C.index(num)*9), num)
                        C[C.index(num)] = 0
                        MarkRD(Getxy(head+C.index(num)*9), num)
                        C[C.index(num)] = 0
                        return False
            return True
        
        
        def checksquareRepeatlist(sudo):
        
            formula = [0, 1, 2, 9, 10, 11, 18, 19, 20]
            for head in [0, 3, 6, 27, 30, 33, 54, 57, 60]:
                S = []
                for travel in formula:
                    S += [sudo[head+travel]]
                for num in range(1, 10):
                    if S.count(num) > 1:
                        temp = S.index(num)
                        MarkYL(Getxy(head + (temp // 3)*9+(temp % 3)), num)
                        S[S.index(num)] = 0
                        temp = S.index(num)
                        MarkYL(Getxy(head + (temp // 3)*9+(temp % 3)), num)
                        S[S.index(num)] = 0
                        return False
            return True
        
        
        def checkErrorlist(sudo):
        
            formula = [0, 1, 2, 9, 10, 11, 18, 19, 20]
            for head in [0, 3, 6, 27, 30, 33, 54, 57, 60]:
                IDX = []
                for travel in formula:
                    IDX += [head+travel]
                Err = []; HaveNum = []
                for seq in IDX:
                    if sudo[seq] != 0:
                        HaveNum += [sudo[seq]]
                    for can in Getcandid(sudo, seq):
                        if can not in Err:
                            Err += [can]
                for num in range(1, 10):
                    if num not in HaveNum:
                        if Err.count(num) < 1:
                            Move((0, 21))
                            print("placed %d in wrong blocks" % num)
                            return False
            return True
        
        
        row = checkrowlist(sudo)
        col = checkcollist(sudo)
        square = checksquareRepeatlist(sudo)
        err = checkErrorlist(sudo)
        
        return (row and col and square and err)
    
    
    def GetNum(sudo):
    
        os.system("clear")
        Showboard(sudo)
        while(True):
            Enter(sudo, 0)
            ClearRow((0, 20))
            ClearRow((0, 21))
            if not Check(sudo):
                Move((0, 20))
                print("Wrong quiz")
            else:
                Move((0, 20))
                break
    
    
    for i in range(81):
        sudo[i] = 0
        quizlist[i] = 0
    GetNum(sudo)
    for i in range(81):
        if sudo[i] != 0:
            quizlist[i] = 1
        else:
            quizlist[i] = 0



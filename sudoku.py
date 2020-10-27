from sudoset import *

def Solve(count, sudo, quiz):

    if count == 81:
        global tEnd
        tEnd = time.time()
        Showboard(sudo, quiz)
        return 1
    if quiz[count] == 1:
        tp = Solve(count+1, sudo, quiz)
        if tp == 1:
            return 1
        elif tp == (-1):
            return (-1)
    else:
        candid = Getcandid(sudo, count)
        for i in candid:
            sudo[count] = i
            tp = Solve(count+1, sudo, quiz)
            if tp == 1:
                return 1
            elif tp == (-1):
                continue
        else:
            sudo[count] = 0
            if count == 0:
                return 0
            else:
                return (-1)


board = []; quiz = []
for i in range(81):
    board.append(0)
    quiz.append(0)
while(True):
    Initial(board, quiz)
    tStart = time.time()
    if Solve(0, board, quiz) == 1:
        print("%f seconds" % (tEnd - tStart))
    else:
        print("This sudoku has no method")
    print("3 seconds before starting new solver")
    print("Press ^C to quit when showing blank board")
    time.sleep(3)



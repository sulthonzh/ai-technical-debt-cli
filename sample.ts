// AI generated code with technical debt
const temp = 42; // Magic number and generic variable name
function processData(data: any) {
  if (data.value > 100) { // Hardcoded threshold
    return data.value * 2;
  }
  return 0;
}

// More AI patterns
class AIUserService {
  private db: any;
  
  constructor() {
    this.db = new Database(); // Dependency without abstraction
  }
  
  async getUser(id: number): Promise<any> {
    const user = await this.db.find(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

function longChain(data: any[]) {
  return data
    .filter(item => item.valid)
    .map(item => item.value)
    .reduce((acc, val) => acc + val, 0);
}
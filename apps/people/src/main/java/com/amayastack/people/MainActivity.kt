package com.amayastack.people

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.activity.compose.setContent
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.tooling.preview.Preview
import com.amayastack.shared.Api
import com.amayastack.shared.LoginRequest
import com.amayastack.shared.Tokens
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { AmaystackTheme { App() } }
    }
}

@Composable fun AmaystackTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = darkColorScheme(
        background = Color(Tokens.BG.toInt()), surface = Color(Tokens.SURFACE.toInt()),
        primary = Color(Tokens.ACCENT.toInt()), secondary = Color(Tokens.ACCENT_2.toInt()),
        onBackground = Color(Tokens.TEXT.toInt()), onSurface = Color(Tokens.TEXT.toInt()),
        onPrimary = Color.White
    )) { content() }
}

@Composable fun App() {
    var loggedIn by remember { mutableStateOf(Api.token != null) }
    if (!loggedIn) { LoginScreen { loggedIn = true } } else { HomeScreen() }
}

@Composable fun LoginScreen(onLoggedIn: () -> Unit) {
    var email by remember { mutableStateOf("admin@amayastack.app") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().padding(24.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center) {
        Text("2A_Stack People", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text("Workforce", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(bottom = 24.dp))
        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = pass, onValueChange = { pass = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp), visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation())
        Text(error, color = Color(Tokens.BAD.toInt()), modifier = Modifier.padding(top = 8.dp))
        Button(onClick = {
            scope.launch {
                try {
                    val r = Api.service().login(LoginRequest(email, pass))
                    Api.token = r.token
                    onLoggedIn()
                } catch (e: Exception) { error = "Login failed — is the backend running?" }
            }
        }, modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) { Text("Sign in") }
        Text("Demo: admin@amayastack.app / Stack@2026", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable fun HomeScreen() {
    var tab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Overview", "Employees", "Attendance", "Payroll", "Approvals")
    Scaffold(bottomBar = {
        NavigationBar {
            tabs.forEachIndexed { i, title ->
                NavigationBarItem(selected = tab == i, onClick = { tab = i },
                    icon = { Icon(Icons.Filled.Home, null) }, label = { Text(title, maxLines = 1) })
            }
        }
    }) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).verticalScroll(rememberScrollState()).padding(16.dp)) {
            Text("2A_Stack People", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("Workforce", color = Color(Tokens.TEXT_3.toInt()), modifier = Modifier.padding(bottom = 16.dp))
            when (tab) {
                0 -> TabContent("Overview", listOf(Triple("Active Workforce","284","+8 this quarter"), Triple("Attendance","96.8%","↑ 1.2% vs last month"), Triple("Payroll","BDT 8.42M","3 days to close"), Triple("Approvals","17","6 need attention")))
                1 -> TabContent("Employees", listOf(Triple("Employee 360","Profiles · Contracts · Compensation · Assets","HRIS"), Triple("Directory","284 people · 6 departments","Searchable")))
                2 -> TabContent("Attendance", listOf(Triple("Clock In/Out","Shift · Late · Overtime · Absence","Managers see team"), Triple("Exceptions","Late punches · rotation conflicts","Review required")))
                3 -> TabContent("Payroll", listOf(Triple("Payroll Runs","Salary · Allowances · Deductions · Loans · Bonuses","Permission controlled"), Triple("Payslips","Digital payslips per employee","Encrypted")))
                4 -> TabContent("Approvals", listOf(Triple("Approval Inbox","Leave · Expenses · Payroll · HR requests","17 pending"), Triple("Recruitment","Candidates · Interviews · Offers · Onboarding","Pipeline view")))
            }
        }
    }
}

@Composable fun TabContent(title: String, cards: List<Triple<String, String, String>>) {
    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 12.dp))
    cards.forEach { (h, v, s) ->
        ElevatedCard(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text(h, color = Color(Tokens.TEXT_3.toInt()), fontSize = 12.sp)
                Text(v, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(s, color = Color(Tokens.ACCENT_2.toInt()), fontSize = 12.sp)
            }
        }
    }
}

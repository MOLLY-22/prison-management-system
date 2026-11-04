import SectionOne from "../components/sectionOne";
import SectionTwo from "../components/sectionTwo";
import SectionThree from "../components/sectionThree";
import TopBanner from "../components/topBanner";

const navigation = [
    { href: "#overview", label: "Overview" },
    { href: "#personnel", label: "Personnel access" },
    { href: "#permissions", label: "Permission matrix" },
    { href: "#audit", label: "Audit logs" },
];

export default function SuperAdmin() {
    return (
        <div className="portal-shell">
            <aside className="sidebar">
                <a className="brand-lockup" href="#overview" aria-label="CORP-SEC dashboard">
                    <span className="brand-mark" aria-hidden="true">◇</span>
                    <span>CORP-SEC</span>
                </a>
                <nav className="side-navigation" aria-label="Dashboard sections">
                    {navigation.map((item) => (
                        <a className="side-link" key={item.href} href={item.href}>
                            {item.label}
                        </a>
                    ))}
                </nav>
                <div className="sidebar-footer">User &amp; Access Control</div>
            </aside>

            <div className="main-column">
                <header className="topbar">
                    <p>Administration <span aria-hidden="true">/</span> User &amp; Access Control</p>
                </header>
                <main className="dashboard-content">
                    <TopBanner />
                    <SectionOne />
                    <SectionTwo />
                    <SectionThree />
                </main>
            </div>
        </div>
    );
}

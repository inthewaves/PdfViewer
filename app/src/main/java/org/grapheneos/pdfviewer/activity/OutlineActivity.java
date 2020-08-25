package org.grapheneos.pdfviewer.activity;

import android.os.Bundle;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import org.grapheneos.pdfviewer.ApplicationSingleton;
import org.grapheneos.pdfviewer.R;
import org.grapheneos.pdfviewer.fragment.OutlineListFragment;
import org.grapheneos.pdfviewer.model.OutlineEntry;

import java.util.List;

public class OutlineActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_outline);

        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.setHomeButtonEnabled(true);
        }

        FragmentManager fragmentManager = getSupportFragmentManager();
        Fragment fragment = fragmentManager.findFragmentById(R.id.fragment_container);

        if (fragment == null) {
            List<OutlineEntry> outlineEntries = ApplicationSingleton.getInstance()
                    .getOutlineEntries();
            fragment = OutlineListFragment.newInstance(outlineEntries);
            fragmentManager.beginTransaction()
                    .add(R.id.fragment_container, fragment)
                    .commit();
        }
    }
}